#define NO_DITHER			//don't dither this effect!
#include "effect.frag"

#ifndef CACHE_READ
#include "gaussian.sh"
#include "layernoise.sh"
#include "effectperlinbase.frag"
#include "effectwarpcoords.frag"
#endif

#if(!defined(CACHE_WRITE) || defined(EFFECT_TRIPLANAR))
#include "gradientmap.frag"
#ifndef PREPASS
	#include "data/shader/common/projector.sh"
	#include "layer.sh"
#endif
#endif

uniform float	uContrast;
uniform float	uScale;
uniform int		uInvertEffect;
uniform float	uGranularity;
uniform float	uGrainMin;
uniform float	uLayerMultiplier;

uniform int		uFinalPass;
uniform int		uCurrentPass;
uniform float	uBaseScale;
uniform float	uBaseGrainMin;

USE_TEXTURE2D( tTexture );

#ifndef CACHE_READ
float accumNoise2D(vec2 co, float grainMin, float lastValue)
{
	float tvalue = perlinBicubic(co.x, co.y);
	tvalue = lerp(1.0, tvalue, lerp(grainMin, 1.0, uGranularity));
	lastValue *= tvalue;
	return lastValue;
}

float accumNoise2DRepeat(vec2 co, float grainMin, float lastValue)
{
	float tvalue = perlinBicubicRepeat(co.x, co.y);
	tvalue = lerp(1.0, tvalue, lerp(grainMin, 1.0, uGranularity));
	lastValue *= tvalue;
	return lastValue;
}

float accumNoise3D(vec3 co, float grainMin, float lastValue)
{
	float tvalue = perlin3DValue(co.x, co.y, co.z);
	tvalue = lerp(1.0, tvalue, lerp(grainMin, 1.0, uGranularity));
	lastValue *= tvalue;
	return lastValue;
}

float getNoiseValue(vec2 uv, float scale, vec3 delta, float grainMin, LayerState state, float lastValue)
{
	float value = 0.0;
#ifndef CACHE_READ
	vec2 sampleUV = uv + delta.xy * uOutputSizeInv;
	vec3 samplePos = state.position + delta * length(state.dPosdx);

	#ifdef EFFECT_POSITIONAL
		#ifdef EFFECT_TRIPLANAR
			value = accumNoise2D(applyWarp(sampleUV, 1.0)*scale, grainMin, lastValue);
		#else
			//float value = accumNoise3D(applyWarp3D(samplePos, scale)*scale, lastValue);
			value = accumNoise3D(applyWarp3D(samplePos, 1.0)*scale, grainMin, lastValue);
		#endif
	#else
		//float value = accumNoise2DRepeat(applyTiledWarp(sampleUV, sampleUV, vec2(0, 0), scale) * scale, lastValue);
		value = accumNoise2DRepeat(applyWarp(sampleUV, 1.0)*scale, grainMin, lastValue);
	#endif
#endif // CACHE_READ

	return value;
}

float getLastValue(vec2 uv, vec3 delta, LayerState state, float lastValue)
{
	float value = lastValue;
	float scale = uBaseScale;
	float grainMin = uBaseGrainMin;
	for (int i = 0; i < 3; i++)
	{
		value = getNoiseValue(uv, scale, delta, grainMin, state, value);
		scale /= 2.0;
		grainMin *= 2.0;
	}
	
	return value;
}

float accumNoiseAt(vec2 uv, vec3 delta, LayerState state)
{
	float value = 0.0;
#if LAYER_OUTPUT == CHANNEL_ANISO_DIR
	float lastValue = getLastValue(uv, delta, state, 1.0);
#else
	float lastValue = texture2DLod(tTexture, state.bufferCoord + delta.xy * uOutputSizeInv, 0).x;
#endif
	value = getNoiseValue(uv, uScale, delta, uGrainMin, state, lastValue);
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

vec4 runEffect(LayerState state)
{
#ifdef CACHE_READ
	return vec4(1.0, 1.0, 1.0, 1.0);	//unused value
#else
		vec2 sampleCoord = state.texCoord;
		vec4 outputColor = vec4(0.0, 0.0, 0.0, 0.0);
		float value = accumNoiseAt(sampleCoord, vec3(0.0, 0.0, 0.0), state);
		outputColor = vec4(value, value, value, 1.0);
		outputColor.w = 1;
		return outputColor;
#endif	//!CACHE_READ
}

float _invert1f( float value, float invert )
{ 
	value = saturate(value);	
	return ( ( (-2.0*value) + 1.0) * invert ) + value;   // 2 instruction invert: A = A - 2Ai + i	
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
		_blendAmount = saturate(float((uFinalPass != 0.0)));		//only the final pass blends
		if( uFinalPass != 0 )
		{
			vec3 d = vec3(getDerivDir(state), 0.0);

			vec3 dir = d;
			float slopeX = acos(dir.x) / PI * 2.0 - 1.0;
			float slopeY = acos(dir.y) / PI * 2.0 - 1.0;
			vec3 result = vec3(normalize(vec2(slopeX, slopeY)), 0.0);
			result.xy = normalize(rotate2D(result.xy, 45.0 / 180.0 * PI));
			d = result;

			d = normalize(mix(vec3(0.0, 1.0, 0.0), d, saturate(uContrast)));
			
			TangentBasis basis;
			basis.T = state.tangent;
			basis.B = state.bitangent;
			basis.N = state.normal;

			vec3 tDir = transformVecTo(basis, d);
			d = tDir;

			state.result.rgb = d * 0.5 + 0.5;
			
			state.result.a = 1.0;
			return state.result;
		}
	#else
		_blendAmount = 0.0;		//prepasses output their value directly without blending
	#endif
	return vec4(value, value, value, 1.0);
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
		_blendAmount = saturate(float((uFinalPass != 0.0)));		//only the final pass blends
		if( uFinalPass != 0 )
		{
			//monochrome with an alpha of 1.0
			value *= uLayerMultiplier;
			value = lerp( 0.5, value, uContrast );		//amount is noise contrast, i.e. lerp between flat gray and noise		
			value = _invert1f( value, float(uInvertEffect) ); 
			state.result.rgb = applyGradientMapGray( value ).rgb;
			state.result.a = 1.0;
			return state.result;
		}
	#else
		_blendAmount = 0.0;		//prepasses output their value directly without blending
	#endif
		return vec4( value, value, value, 1.0 );
#endif
}
