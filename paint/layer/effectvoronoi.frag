#include "effect.frag"

//#ifndef CACHE_READ
#include "gaussian.sh"
#include "layernoise.sh"
#include "effectperlinbase.frag"
#include "effectwarpcoords.frag"
#include "cellular.frag"
#include "phase.frag"
//#endif

#ifdef CACHE_READ
	USE_TEXTURE2D(tCache);
#endif

#include "layer.sh"
#if(!defined(CACHE_WRITE) || defined(EFFECT_TRIPLANAR))
#include "gradientmap.frag"
#ifndef PREPASS
	#include "data/shader/common/projector.sh"
#endif
#endif

uniform int		uInvertEffect;
uniform float	uBrightness;
uniform float	uContrast;
uniform float	uScale;
uniform float	uJitter;
uniform float	uSmoothing;
uniform float	uPhase;

uniform float	uStartValue;
uniform float	uEndValue;

//#ifndef CACHE_READ
vec2 wrapCoordinates(vec2 uv)
{
	if( uv.x < 0 ) uv.x += ((int)((-uv.x/uScale)+1.0f))*uScale;
	if( uv.y < 0 ) uv.y += ((int)((-uv.y/uScale)+1.0f))*uScale;
	uv.x = fmod(uv.x, uScale);
	uv.y = fmod(uv.y, uScale);
	return uv;
}

float getNoiseSample(vec2 uv)
{
	vec2 value = cellular(uv, uJitter);
	float dots = smoothstep(uStartValue, uEndValue, value.x);
	float n = value.y-value.x;
	float result = n * dots;
	return phaseValue(result, uPhase, uSmoothing);
}

vec2 getNoiseSampleDir(vec2 uv)
{
	vec2 dirToF1, dirToF2;
	vec2 value = cellularDir(uv, uJitter, dirToF1, dirToF2);
	float dots = smoothstep(uStartValue, uEndValue, value.x);
	float n = value.y-value.x;
	float result = n * dots;
	return dirToF2;
}

float getNoiseSample3D(vec3 pos)
{
	vec2 value = cellular3D(pos, uJitter);
	float dots = smoothstep(uStartValue, uEndValue, value.x);
	float n = value.y-value.x;
	float result = n * dots;
	return phaseValue(result, uPhase, uSmoothing);
}

vec3 getNoiseSample3DDir(vec3 pos)
{
	vec3 dirToF1, dirToF2;
	vec2 value = cellular3DDir(pos, uJitter, dirToF1, dirToF2);
	float dots = smoothstep(uStartValue, uEndValue, value.x);
	float n = value.y-value.x;
	float result = n * dots;
	return dirToF2;
}

float generateSample(vec2 uv)
{
	if( uWarpAmplitude != 0 )
	{
		uv = applyWarp(uv, 1.0f);
	}
	float result = getNoiseSample(uv);
	return result;
}

vec3 generateSampleDir(vec2 uv)
{
	if( uWarpAmplitude != 0 )
	{
		uv = applyWarp(uv, 1.0f);
	}
	vec2 result = getNoiseSampleDir(uv);
	return vec3(result, 0.0);
}

float generateSample3D(vec3 pos)
{
	if( uWarpAmplitude != 0 )
	{
		pos = applyWarp3D(pos, 1.0f);
	}
	float result = getNoiseSample3D(pos);
	return result;
}

vec3 generateSample3DDir(vec3 pos)
{
	if( uWarpAmplitude != 0 )
	{
		pos = applyWarp3D(pos, 1.0f);
	}
	vec3 result = getNoiseSample3DDir(pos);
	return result;
}

float getSampleAt(vec2 uv, LayerState state)
{
	float value = 0.0;
#ifndef CACHE_READ
	vec2 sampleUV = uv;
	vec3 samplePos = state.position;

	#ifdef EFFECT_POSITIONAL
		#ifdef EFFECT_TRIPLANAR
			value = generateSample( (sampleUV + vec2(uRandomSeedValue, uRandomSeedValue)) * uScale);
		#else
			value = generateSample3D((samplePos + vec3(uRandomSeedValue, uRandomSeedValue, uRandomSeedValue))* uScale);
		#endif
	#else
		//float value = generateSample(applyTiledWarp(state.texCoord.xy, state.texCoord.xy, vec2(uRandomSeedValue, uRandomSeedValue), uScale) * uScale);
		value = generateSample((sampleUV + vec2(uRandomSeedValue, uRandomSeedValue))* uScale);
	#endif
#endif
	return value;
}

vec3 getSampleDirAt(vec2 uv, LayerState state)
{
	vec3 dir = vec3(0.0, 0.0, 0.0);
//#ifndef CACHE_READ
	vec2 sampleUV = uv;
	vec3 samplePos = state.position;

	#ifdef EFFECT_POSITIONAL
		#ifdef EFFECT_TRIPLANAR
			dir = generateSampleDir( (sampleUV + vec2(uRandomSeedValue, uRandomSeedValue)) * uScale);
		#else
			dir = generateSample3DDir((samplePos + vec3(uRandomSeedValue, uRandomSeedValue, uRandomSeedValue))* uScale);
		#endif
	#else
		//float value = generateSample(applyTiledWarp(state.texCoord.xy, state.texCoord.xy, vec2(uRandomSeedValue, uRandomSeedValue), uScale) * uScale);
		dir = generateSampleDir((sampleUV + vec2(uRandomSeedValue, uRandomSeedValue))* uScale);
	#endif
//#endif
	return dir;
}
//#endif

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.texCoord;
	vec4 outputColor = vec4(0.0, 0.0, 0.0, 0.0);

#if LAYER_OUTPUT == CHANNEL_ANISO_DIR
	#ifndef CACHE_WRITE
		#ifdef EFFECT_POSITIONAL
			vec3 d = getSampleDirAt(sampleCoord, state);
			d = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(d), saturate(uContrast)));
			
			TangentBasis basis;
			basis.T = state.tangent;
			basis.B = state.bitangent;
			basis.N = state.normal;

			vec3 tDir = transformVecTo(basis, d);
			d = tDir;
		#else	
			vec2 d = getSampleDirAt(sampleCoord, state).xy;
			d = normalize(mix(vec2(0.0, 1.0), normalize(d), saturate(uContrast)));
		#endif // EFFECT_POSITIONAL

		vec3 t;
		t.xy =  d.xy*0.5+0.5;
		t.z = 0.5;
		#ifdef EFFECT_POSITIONAL
			t.z = d.z*0.5+0.5;
		#endif
		outputColor.rgb.rgb = t;
	#endif
#else
	#ifndef CACHE_READ
		float value = getSampleAt(sampleCoord, state);
		outputColor = vec4(value, value, value, 1.0);
	#endif //!CACHE_READ
#endif

	outputColor.w = 1;
	return outputColor;
}
 

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ 
#if LAYER_OUTPUT == CHANNEL_ANISO_DIR
	vec4 value = state.result;
	
	#ifndef CACHE_WRITE
	/*
		vec2 sampleCoord = state.texCoord;
		#ifdef EFFECT_POSITIONAL
			vec3 d = getSampleDirAt(sampleCoord, state);
			d = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(d), saturate(uContrast)));
			
			TangentBasis basis;
			basis.T = state.tangent;
			basis.B = state.bitangent;
			basis.N = state.normal;

			vec3 tDir = transformVecTo(basis, d);
			d = tDir;
		#else	
			vec2 d = getSampleDirAt(sampleCoord, state).xy;
			d = normalize(mix(vec2(0.0, 1.0), normalize(d), saturate(uContrast)));
		#endif // EFFECT_POSITIONAL

		vec3 t;
		t.xy =  d.xy*0.5+0.5;
		t.z = 0.5;
		#ifdef EFFECT_POSITIONAL
			t.z = d.z*0.5+0.5;
		#endif
		value.rgb = t;
	*/
		if( uInvertEffect != 0 )
		{ value = 1.0 - value; }

		state.result.rgb = value.rgb;
		state.result.a = 1.0;
		return state.result;
	#else
		_blendAmount = 0.0;	//prepass, no blend	
	#endif	
		return vec4( value.xyz, 1.0 );
#else
	#ifdef CACHE_READ
		#ifdef BCKEN_CACHE
			//decode BCKEN
			vec4 bcken = texture2DLod( tCache, state.bufferCoord, 0 );
			float value = bcken.r + (bcken.y-0.5) * 4.0 / 255.0;
		#else
			float value = texture2DLod( tCache, state.bufferCoord, 0 ).r;
		#endif		//BCKEN_CACHE
	#else
		float value = state.result.r;
	#endif
	
	#ifndef CACHE_WRITE
		value *= uBrightness;

		if( uInvertEffect != 0 )
		{ value = 1.0 - value; }

		value = lerp( 0.5, value, uContrast );		//amount is noise contrast, i.e. lerp between flat gray and noise
		state.result.rgb = applyGradientMapGray(value).rgb;
		state.result.a = 1.0;
		return state.result;
	#else
		_blendAmount = 0.0;	//prepass, no blend	
	#endif	
		return vec4( value, value, value, 1.0 );
#endif
}

