#include "effect.frag"
#include "gaussian.sh"
#include "layernoise.sh"
#include "gradientmap.frag"

#ifndef PREPASS
	#include "data/shader/common/projector.sh"
	#include "layer.sh"
#endif

uniform int		uInvertEffect;
uniform float	uBrightness;
uniform float	uContrast;

uniform int		uScratchMode;
uniform float	uScratchAlpha;

uniform int		uGrungeMode;
uniform float	uGrungeAlpha;

uniform int		uOcclusionMode;
uniform float	uOcclusionAlpha;

uniform float	uEdgeThickness;
uniform float	uEdgeIntensity;

uniform int		uEnableScratchSample;
uniform int		uEnableGrungeSample;
uniform int		uEnableCurvatureSample;
uniform int		uEnableOcclusionSample;

uniform int		uTriPlanarGrunge;
uniform int		uTriPlanarScratch;

uniform mat4	uScratchTextureMatrix;
uniform mat4	uGrungeTextureMatrix;


/////////////////////////////////////////////////////////////////////////////////////////////////////
uniform float	uContrastOcclusion;

vec4 getOcclusionSample( vec2 sampleCoord )
{
#ifdef USE_INPUT_AO
	vec4 texel = sampleInputGray( INPUT_AO, sampleCoord );
	float value = texel.x;
	value = saturate( (value - 0.5) * uContrastOcclusion + 0.5 );
	return vec4(value, value, value, uOcclusionAlpha);
#else
	return vec4(1.0,1.0,1.0,1.0);
#endif
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
uniform float	uContrastCurvature;
uniform vec2	uCurveClamp;

float curveFunction( vec4 texel )
{
	float edge = (2.0 * texel.r) - 1.0;
	edge = max( 0.0, edge - uCurveClamp.x ) * uCurveClamp.y;
	
	float thick;
	thick = 1.0 - uEdgeThickness;
	thick *= 0.5;
	thick = thick * 0.64 + 0.36;
	edge = pow(edge, thick);
	edge *= uEdgeIntensity;
	return edge;
}

vec4 getCurvatureSample(vec2 sampleCoord)
{
#ifdef USE_INPUT_CURVATURE
	vec4 sample = sampleInputGray( INPUT_CURVATURE, sampleCoord );
	float value = curveFunction( sample );
	value = saturate( (value - 0.5) * uContrastCurvature + 0.5 );
	return vec4(value, value, value, 1.0);
#else
	return vec4(1.0,1.0,1.0,1.0);
#endif
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
USE_TEXTURE2D( tScratch );
uniform float	uContrastScratch;
uniform float	uInvertScratch;
uniform float	uGrayScratch;

vec4 getScratchSample(vec2 sampleCoord, vec2 dUVx, vec2 dUVy)
{
	sampleCoord = 
		col0(uScratchTextureMatrix).xy * sampleCoord.x + 
		col1(uScratchTextureMatrix).xy * sampleCoord.y + 
		col3(uScratchTextureMatrix).xy;

	vec4 sample = texture2DAutoLod( tScratch, sampleCoord, dUVx, dUVy);

	sample.x = (sample.x - 0.5f) * uContrastScratch + 0.5f;
	sample.y = (sample.y - 0.5f) * uContrastScratch + 0.5f;
	sample.z = (sample.z - 0.5f) * uContrastScratch + 0.5f;		
	sample = saturate( sample );
	sample.x = mix( sample.x, 1.0-sample.x, uInvertScratch );
	sample.y = mix( sample.y, 1.0-sample.y, uInvertScratch );
	sample.z = mix( sample.z, 1.0-sample.z, uInvertScratch );
	sample = mix( sample, sample.rrra, uGrayScratch ); 
	sample.a *= uScratchAlpha;
	return sample;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
USE_TEXTURE2D( tGrunge );
uniform float	uContrastGrunge;
uniform float	uInvertGrunge;
uniform float	uGrayGrunge;

vec4 getGrungeSample(vec2 sampleCoord, vec2 dUVx, vec2 dUVy)
{
	sampleCoord = 
		col0(uGrungeTextureMatrix).xy * sampleCoord.x + 
		col1(uGrungeTextureMatrix).xy * sampleCoord.y + 
		col3(uGrungeTextureMatrix).xy;

	vec4 sample = texture2DAutoLod( tGrunge, sampleCoord, dUVx, dUVy);

	sample.x = (sample.x - 0.5f) * uContrastGrunge + 0.5f;
	sample.y = (sample.y - 0.5f) * uContrastGrunge + 0.5f;
	sample.z = (sample.z - 0.5f) * uContrastGrunge + 0.5f;		
	sample = saturate( sample );
	sample.x = mix( sample.x, 1.0-sample.x, uInvertGrunge );
	sample.y = mix( sample.y, 1.0-sample.y, uInvertGrunge );
	sample.z = mix( sample.z, 1.0-sample.z, uInvertGrunge );
	sample = mix( sample, sample.rrra, uGrayGrunge ); 
	sample.a *= uGrungeAlpha;
	return sample;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////

vec4 blendValues(vec4 front, vec4 back, float fade, int mode)
{
	//runtime blend

	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	
	if ( mode == LBLEND_ALPHA )
	{
		return blendAlpha( front, back, fade );
	}
	else if ( mode == LBLEND_ADD )
	{
		return blendAddNoSaturate( front, back, fade );
	}
	else if ( mode == LBLEND_MULTIPLY )
	{
		return blendMultiply( front, back, fade );
	}
	else if ( mode == LBLEND_OVERLAY )
	{
		return blendOverlay( front, back, fade );
	}
	else if ( mode == LBLEND_COLOR_DODGE )
	{
		return blendColorDodge( front, back, fade );
	}
	else if ( mode == LBLEND_COLOR_BURN )
	{
		return blendColorBurn( front, back, fade );
	}
	return back;
}

vec4 getScratchSampleTriPlanar(vec2 sampleCoord, vec3 position, vec3 normal, vec3 tangent, vec3 bitangent, vec3 dPosdx, vec3 dPosdy)
{
	vec4 value = vec4(0,0,0,1);
#ifdef USE_INPUT_NORMAL
	vec3 inputNormal = sampleInputVector( INPUT_NORMAL, sampleCoord ).xyz;
	TriplanarProjector p = getTriplanarProjectorLod( position, normal, inputNormal, createTangentBasis( tangent, bitangent, normal ), dPosdx, dPosdy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation, uTriplanarFade );
#else
    TriplanarProjector p = getTriplanarProjectorLod( position, normal, createTangentBasis( tangent, bitangent, normal ), dPosdx, dPosdy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation, uTriplanarFade );
#endif
	vec4 vx = getScratchSample( p.uvX.xy, unpackTextureGrad( p.uvX.z ), unpackTextureGrad( p.uvX.w ) );
	vec4 vy = getScratchSample( p.uvY.xy, unpackTextureGrad( p.uvY.z ), unpackTextureGrad( p.uvY.w ) );
	vec4 vz = getScratchSample( p.uvZ.xy, unpackTextureGrad( p.uvZ.z ), unpackTextureGrad( p.uvZ.w ) );
#if LAYER_OUTPUT == CHANNEL_NORMAL
	value = triplanarMixNormals( p, vx, vy, vz );
#else
	value = triplanarMix( p, vx, vy, vz );
#endif
	return value;
}

vec4 getGrungeSampleTriPlanar(vec2 sampleCoord, vec3 position, vec3 normal, vec3 tangent, vec3 bitangent, vec3 dPosdx, vec3 dPosdy)
{
	vec4 value = vec4(0,0,0,1);
#ifdef USE_INPUT_NORMAL
	vec3 inputNormal = sampleInputVector( INPUT_NORMAL, sampleCoord ).xyz;
	TriplanarProjector p = getTriplanarProjectorLod( position, normal, inputNormal, createTangentBasis( tangent, bitangent, normal ), dPosdx, dPosdy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation, uTriplanarFade );
#else
    TriplanarProjector p = getTriplanarProjectorLod( position, normal, createTangentBasis( tangent, bitangent, normal ), dPosdx, dPosdy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation, uTriplanarFade );
#endif
	vec4 vx = getGrungeSample( p.uvX.xy, unpackTextureGrad( p.uvX.z ), unpackTextureGrad( p.uvX.w ) );
	vec4 vy = getGrungeSample( p.uvY.xy, unpackTextureGrad( p.uvY.z ), unpackTextureGrad( p.uvY.w ) );
	vec4 vz = getGrungeSample( p.uvZ.xy, unpackTextureGrad( p.uvZ.z ), unpackTextureGrad( p.uvZ.w ) );
#if LAYER_OUTPUT == CHANNEL_NORMAL
	value = triplanarMixNormals( p, vx, vy, vz );
#else
	value = triplanarMix( p, vx, vy, vz );
#endif
	return value;
}

vec4 getScratchGeneratorSample(vec2 sampleCoord, vec3 position, vec3 normal, vec3 tangent, vec3 bitangent, vec3 dPosdx, vec3 dPosdy)
{
	vec4 curve =	getCurvatureSample( sampleCoord );
	vec4 occlusion=	getOcclusionSample( sampleCoord );
	vec4 grunge =	vec4(1,1,1,1);
	vec4 scratch =	vec4(1,1,1,1);
	
#ifdef EFFECT_POSITIONAL
	if( uEnableScratchSample != 0 )
	{
		if( uTriPlanarScratch != 0 )
		{ scratch = getScratchSampleTriPlanar( sampleCoord, position, normal, tangent, bitangent, dPosdx, dPosdy  ); }
		else 
		{ scratch = getScratchSample( sampleCoord, vec2(uOutputSizeInv.x, 0.0), vec2(0.0, uOutputSizeInv.y) ); }
	}
	if( uEnableGrungeSample != 0 )
	{
		if( uTriPlanarGrunge != 0 )
		{ grunge = getGrungeSampleTriPlanar( sampleCoord, position, normal, tangent, bitangent, dPosdx, dPosdy  ); }
		else 
		{ grunge = getGrungeSample( sampleCoord, vec2(uOutputSizeInv.x, 0.0), vec2(0.0, uOutputSizeInv.y) ); }
	}
#else
	if( uEnableScratchSample != 0 ) scratch = getScratchSample( sampleCoord );
	if( uEnableGrungeSample != 0 ) grunge = getGrungeSample( sampleCoord,  );
#endif

	//curvature   <- start here
	//grunge
	//scratch
	//occlusion      <- pile on to here

	vec4 value = blendValues(grunge, curve, 1.0, uGrungeMode);
	value = blendValues(scratch, value, 1.0, uScratchMode);
	value = blendValues(occlusion, value, 1.0, uOcclusionMode);

	return value;
}

vec4 runEffect(LayerState state)
{
	vec4 value = getScratchGeneratorSample(state.bufferCoord, state.position, state.normal, state.tangent, state.bitangent, state.dPosdx, state.dPosdy);

	value.w = 1;
	value.xyz *= uBrightness;
	if( uInvertEffect != 0 )
	{
		value.x = 1.0 - value.x;
		value.y = 1.0 - value.y;
		value.z = 1.0 - value.z;
	}
	value = lerp( vec4(0.5,0.5,0.5,1.0), value, uContrast );
	return applyGradientMapRGB(value);
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{
	_blendAmount = 0.0;	//this is a pre-pass
	return state.result;
}

