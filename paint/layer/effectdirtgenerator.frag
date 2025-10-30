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

uniform int		uGrungeMode;
uniform float	uGrungeAlpha;

uniform vec3	uDirection;
uniform int		uDirectionMode;
uniform float	uDirectionAlpha;

uniform int		uCreviceMode;
uniform float	uCreviceThickness;
uniform float	uCreviceAlpha;

uniform int		uEnableGrungeSample;
uniform int		uEnableNormalsSample;
uniform int		uEnableNormalsObjectSample;
uniform int		uEnableCurvatureSample;
uniform int		uEnableOcclusionSample;

uniform int		uTriPlanarGrunge;

uniform mat4	uGrungeTextureMatrix;

/////////////////////////////////////////////////////////////////////////////////////////////////////
uniform float	uContrastOcclusion;
uniform float	uIntensityOcclusion;
uniform float	uInvertOcclusion;

vec4 getOcclusionSample( vec2 sampleCoord )
{
#ifdef USE_INPUT_AO
	vec4 texel = sampleInputGray( INPUT_AO, sampleCoord );
	float value = texel.x;
	value = saturate( (value - 0.5f) * uContrastOcclusion + 0.5f );
	value = mix( value, 1.0-value, uInvertOcclusion );
	value = mix( 0.0, value, uIntensityOcclusion );
	return vec4( value, value, value, 1.0 );
#else
	return vec4( 1.0, 1.0, 1.0, 1.0 );
#endif
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
float dirFunction( vec3 objNormal, float contrast )
{
	float value = (dot( objNormal, uDirection ) * 0.5) + 0.5; 
	value = saturate( (value - 0.5) * contrast + 0.5 );	
	return value;
}

uniform float	uContrastNormals;
vec3 applyNormalMap(vec3 TSNormal, vec3 normal, vec3 tangent, vec3 bitang)
{
	float l = length(tangent);	//@@@ TODO: is there a way to do this without branches, lengths, and divides?
	if(l > 0.0001)
	{ tangent /= l; }
	l = length(bitang);
	if(l > 0.0001)
	{ bitang /= l; }
	vec3 result = normalize(TSNormal.x * tangent + TSNormal.y * bitang + TSNormal.z * normal);
	return result;
}

vec4 getNormalsSample(vec2 sampleCoord, vec3 normal, vec3 tangent, vec3 bitang)
{
#ifdef USE_INPUT_NORMAL
	vec3 N = sampleInputVector( INPUT_NORMAL, sampleCoord ).xyz;
	N = applyNormalMap(N, normal, tangent, bitang);
	float value = dirFunction( N, uContrastNormals );
	return vec4(value, value, value, uDirectionAlpha);
#else
	return vec4( 0.0, 0.0, 0.0, 1.0 );
#endif
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
uniform float	uContrastNormalsObject;

vec4 getNormalsObjectSample(vec2 sampleCoord)
{
#ifdef USE_INPUT_NORMAL_OBJECT
	vec3 N = sampleInputVector( INPUT_NORMAL_OBJECT, sampleCoord ).xyz;
	float value = dirFunction( N, uContrastNormalsObject );
	return vec4(value, value, value, uDirectionAlpha);
#else
	return vec4( 0.0, 0.0, 0.0, 1.0 );
#endif
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
uniform float	uContrastCurvature;
uniform float	uInvertCurvature;
uniform vec2	uCurveClamp;

float curveFunction( vec4 texel, float contrast )
{
	// dead-zone near zero curvature/cavity. Helps mitigate noise from 0.5 stored as 8-bit gray
	float cavity = 1.0 - 2.0 * texel.r;
	cavity = max( 0.0, cavity - uCurveClamp.x ) * uCurveClamp.y;

	float thick = 1.0 - uCreviceThickness;
	thick *= 0.5;
	thick = thick * 0.6 + 0.4;
	cavity = pow(cavity, thick);
	cavity = saturate( (cavity - 0.5) * contrast + 0.5 );	
	
	float value = cavity;
	value = mix( value, 1.0-value, uInvertCurvature );
	return value;
}

vec4 getCurvatureSample( vec2 sampleCoord )
{
#ifdef USE_INPUT_CURVATURE
	vec4 sample = sampleInputGray( INPUT_CURVATURE, sampleCoord );
	float value = curveFunction( sample, uContrastCurvature );	
	return vec4( value, value, value, uCreviceAlpha );
#else
	return vec4( 1.0, 1.0, 1.0, 1.0 );
#endif
}

/////////////////////////////////////////////////////////////////////////////////////////////////////

USE_TEXTURE2D( tGrunge );
uniform float	uContrastGrunge;
uniform float	uInvertGrunge;
uniform float	uGrayGrunge;

vec4 getGrungeSample(vec2 sampleCoord, vec2 dUVdx, vec2 dUVdy)
{

	sampleCoord = 
		col0(uGrungeTextureMatrix).xy * sampleCoord.x + 
		col1(uGrungeTextureMatrix).xy * sampleCoord.y + 
		col3(uGrungeTextureMatrix).xy;

	vec4 sample = texture2DAutoLod( tGrunge, sampleCoord, dUVdx, dUVdy);

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

vec4 dirtMix(vec4 grunge, LayerState state)
{
	//occlusion   <- start here
	//curvature
	//normals
	//grunge      <- pile on to here
	vec4 occlusion =	vec4(1.0,1.0,1.0,1.0);
	vec4 normals =		vec4(1.0,1.0,1.0,1.0);
	vec4 curve =		vec4(1.0,1.0,1.0,1.0);
	
#ifdef EFFECT_POSITIONAL	
	#if defined(USE_INPUT_NORMAL_OBJECT)
		normals = getNormalsObjectSample( state.texCoord );	
	#elif defined(USE_INPUT_NORMAL)
		normals = getNormalsSample( state.texCoord, state.normal, state.tangent, state.bitangent );
	#endif
	
#else
	#if defined(USE_INPUT_NORMAL_OBJECT)
		normals = getNormalsObjectSample( state.texCoord );
	#else
		normals = vec4(1.0,1.0,1.0,1.0);
	#endif

#endif

	curve = getCurvatureSample( state.texCoord );
	occlusion = getOcclusionSample( state.texCoord );
	vec4 value = blendValues(curve, occlusion, 1.0, uCreviceMode);
	
	#if defined(USE_INPUT_NORMAL_OBJECT) || defined(USE_INPUT_NORMAL)
		value = blendValues(normals, value, 1.0, uDirectionMode);
	#endif

	value = blendValues(grunge, value, 1.0, uGrungeMode);
	return value;
}

vec4 runEffect(LayerState state)
{
	vec4 grunge = vec4(1.0,1.0,1.0,1.0);
	if( uEnableGrungeSample != 0 ) 
	{ grunge = getGrungeSample( state.texCoord, state.dUVdx, state.dUVdy); }

	return grunge;

}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{
	vec4 value = state.result;
	value = dirtMix(value, state);
	value.w = 1;
	value.xyz *= uBrightness;
	if( uInvertEffect != 0 )
	{
		value.x = 1.0f - value.x;
		value.y = 1.0f - value.y;
		value.z = 1.0f - value.z;
	}
	value = lerp( vec4(0.5,0.5,0.5,1.0), value, uContrast );
	value = applyGradientMapRGB(value);
	_blendAmount = 0.0;	//this is a pre-pass
	return value;

}

