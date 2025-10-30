#define NO_DITHER
#include "effect.frag"
#ifndef CACHE_READ
#include "gaussian.sh"
#include "layernoise.sh"
#include "turbulence.frag"
#include "effectwarpcoords.frag"
#endif

#include "layer.sh"

#ifndef CACHE_WRITE
#include "gradientmap.frag"
#ifndef PREPASS
	#include "data/shader/common/projector.sh"
#endif
#endif

uniform int		uInvertEffect;
uniform float	uIntensity;

uniform float	uNoiseAmplitude;
uniform float	uNoiseFrequency;
uniform float	uNoiseContrast;
uniform float	uLayerMultiplier;

uniform float	uScale;

uniform int		uNumPasses;
uniform int		uFinalPass;


USE_TEXTURE2D( tTexture );

/*float getNoiseSample(vec2 uv)
{
	return getTurbulence(uv, uNoiseFrequency, uNoiseAmplitude);
}

float getNoiseSample3D(vec3 pos)
{
	return getTurbulence3D(pos, uNoiseFrequency, uNoiseAmplitude);
}*/

#ifndef CACHE_READ
float getNoiseSample(vec2 uv)
{
	return getTurbulence(uv + vec2(uRandomSeedValue, uRandomSeedValue), uNoiseFrequency, uNoiseAmplitude);
}

float getNoiseSample3D(vec3 pos)
{
	return getTurbulence3D(pos + vec3(uRandomSeedValue, uRandomSeedValue, uRandomSeedValue), uNoiseFrequency, uNoiseAmplitude);
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

float generateSample3D(vec3 pos)
{
	if( uWarpAmplitude != 0 )
	{
		pos = applyWarp3D(pos, 1.0f);
	}
	float result = getNoiseSample3D(pos);
	return result;
}

float generateSampleAt(vec2 uv, vec3 delta, LayerState state)
{
	float value = 0.0;
	
#ifndef CACHE_READ
	vec2 sampleUV = uv + delta.xy * uOutputSizeInv;
	vec3 samplePos = state.position + delta * length(state.dPosdx);

	#ifdef EFFECT_POSITIONAL
		#ifdef EFFECT_TRIPLANAR
			value = generateSample( sampleUV * uScale );
			vec4 vx = vec4(sx, sx, sx, 1);
			vec4 vy = vec4(sy, sy, sy, 1);
			vec4 vz = vec4(sz, sz, sz, 1);
			#if LAYER_OUTPUT == CHANNEL_NORMAL
				value = triplanarMixNormals( p, vx, vy, vz ).x;
			#else
				value = triplanarMix( p, vx, vy, vz ).x;
			#endif
		#else
			//3d sample		
			value = generateSample3D(samplePos * uScale);
		#endif		
	#else
	//2d sample
		value = generateSample(sampleUV * uScale);
	#endif
#endif
	return value;
}
#endif

float gatherSampleAt(vec2 uv, vec3 delta, LayerState state)
{
#ifdef BCKEN_CACHE
	vec4 bcken = texture2DLod(tTexture, state.bufferCoord + delta.xy * uOutputSizeInv, 0);
	float value = bcken.r + (bcken.y-0.5) * 4.0 / 255.0;
	return value;
#else
	return texture2DLod(tTexture, state.bufferCoord + delta.xy * uOutputSizeInv, 0).r;
#endif
}

vec2 getDerivDir(LayerState state)
{
	vec2 uv = state.bufferCoord;

	const int2 texAddrOffsets[8] = {
        int2(-1, -1), 
        int2( 0, -1),
        int2( 1, -1),
        int2(-1,  0),
        int2( 1,  0),
        int2(-1,  1),
        int2( 0,  1),
        int2( 1,  1),
	};
	
	float samples[8] = { 0, 0, 0, 0, 0, 0, 0, 0 };
	
	float cent = gatherSampleAt(uv, vec3(0.0, 0.0, 0.0), state);
	for( int i = 0; i<8; i++ )
	{
		vec3 offset = normalize(vec3(vec2(texAddrOffsets[i]), 0.0));
#ifdef EFFECT_POSITIONAL
	#ifndef EFFECT_TRIPLANAR
		TangentBasis basis;
		basis.T = state.tangent;
		basis.B = state.bitangent;
		basis.N = state.normal;

		vec3 tDir = transformVecTo(basis, offset);
		offset = normalize(tDir);
	#endif
#endif
		samples[i] = gatherSampleAt(uv, vec3(offset.xy * 2.5, 0.0), state);
	}

	float x = samples[0] + samples[3] * 2.0 + samples[5] - samples[2] - samples[4] * 2.0 - samples[7];
	float y = samples[0] + samples[1] * 2.0 + samples[2] - samples[5] - samples[6] * 2.0 - samples[7];

	return vec2(x, y);
}

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

vec4 runEffect(LayerState state)
{
#ifdef CACHE_READ
	return vec4(1.0, 1.0, 1.0, 1.0);	//unused value
#else
	float value = 1.0;
	value = generateSampleAt(state.texCoord, vec3(0.0, 0.0, 0.0), state);
	value = 1.0f - ((1.0f - value)*uNoiseContrast);
	
	vec4 outputColor = texture2DLod( tTexture, state.bufferCoord, 0 ).xxxx;
	if (!any(outputColor))
	{ outputColor = vec4(1.0, 1.0, 1.0, 1.0);}
	outputColor.xyz *= value;
	outputColor.w = 1.0;
	return outputColor;
#endif	//CACHE_READ
}

vec2 rotate2D(vec2 v, float theta)
{
	return vec2(v.x * cos(theta) - v.y * sin(theta), v.x * sin(theta) + v.y * cos(theta));
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ 
#if LAYER_OUTPUT == CHANNEL_ANISO_DIR
	#ifdef CACHE_READ
		#ifdef BCKEN_CACHE
			//decode BCKEN
			vec4 bcken = texture2DLod( tTexture, state.bufferCoord, 0 );
			float value = bcken.r + (bcken.y-0.5) * 4.0 / 255.0;
		#else
			float value = texture2DLod( tTexture, state.bufferCoord, 0 ).r;
		#endif		//BCKEN_CACHE

	#else
		float value = state.result.r;
	#endif

	#ifndef CACHE_WRITE
		if( uFinalPass != 0 )
		{
			vec3 d = vec3(getDerivDir(state), 0.0);
			d = normalize(d);

			vec3 dir = d;
			float slopeX = acos(dir.x) / PI * 2.0 - 1.0;
			float slopeY = acos(dir.y) / PI * 2.0 - 1.0;
			vec3 result = vec3(normalize(vec2(slopeX, slopeY)), 0.0);
			result.xy = normalize(rotate2D(result.xy, 45.0 / 180.0 * PI));
			d = result;
			
			d = normalize(mix(vec3(0.0, 1.0, 0.0), normalize(d), saturate(uIntensity)));

			TangentBasis basis;
			basis.T = state.tangent;
			basis.B = state.bitangent;
			basis.N = state.normal;

			vec3 tDir = transformVecTo(basis, d);
			d = tDir;

			if( uInvertEffect != 0 )
			{ d = 1.0-d; }
			
			state.result = vec4(d.xyz * 0.5 + 0.5, 1.0);
			return state.result;
		}	
	#endif
	
		_blendAmount = 0.0;	//no blending on prepass
		return vec4( value, value, value, 1.0 );
#else
	#ifdef CACHE_READ
		#ifdef BCKEN_CACHE
			//decode BCKEN
			vec4 bcken = texture2DLod( tTexture, state.bufferCoord, 0 );
			float value = bcken.r + (bcken.y-0.5) * 4.0 / 255.0;
		#else
			float value = texture2DLod( tTexture, state.bufferCoord, 0 ).r;
		#endif		//BCKEN_CACHE

	#else
		float value = state.result.r;
	#endif

	#ifndef CACHE_WRITE
		if( uFinalPass != 0 )
		{
			//monochrome with an alpha of 1.0
			// value *= uIntensity;
			value = lerp( 0.5, value, uIntensity );
			if( uInvertEffect != 0 )
			{ value = 1.0-value; }
			value *= uLayerMultiplier;
			state.result.rgb = applyGradientMapGray(value).rgb;		
			state.result.a = 1.0;
			return state.result;
		}	
	#endif
		_blendAmount = 0.0;	//no blending on prepass
		return vec4( value, value, value, 1.0 );
#endif
}
