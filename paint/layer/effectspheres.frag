#include "gaussian.sh"
#include "layernoise.sh"
#include "effectperlinbase.frag"
#include "gradientmap.frag"

#ifndef PREPASS
	#include "data/shader/common/projector.sh"
	#include "layer.sh"
#endif

USE_TEXTURE2D( tBaseTexture );

uniform int		uInvertEffect;
uniform float	uContrast;

uniform float	uScale;

uniform float	uNoiseScaleA;
uniform float	uNoiseAmplitudeA;
uniform float	uNoiseFrequencyA;
uniform float	uNoiseContrastA;

uniform float	uNoiseScaleB;
uniform float	uNoiseAmplitudeB;
uniform float	uNoiseFrequencyB;
uniform float	uNoiseContrastB;

uniform float	uNoiseScaleC;
uniform float	uNoiseAmplitudeC;
uniform float	uNoiseFrequencyC;
uniform float	uNoiseContrastC;

uniform int		uTriPlanar;

float getTurbulence(vec2 sampleCoord, float frequency, float amplitude)
{
	float value = getPerlin2D(sampleCoord.x, sampleCoord.y, 0);
	float offset = sampleCoord.y+sampleCoord.y;
	value = sin(frequency*(offset+(value*amplitude)));
	value = (value+1)/2;
	return value;
}

float getTurbulence3D(vec3 fPosition, float frequency, float amplitude)
{
	float value = perlin3DValue(fPosition.x, fPosition.y, fPosition.y, 0).x;
	float offset = fPosition.y+fPosition.y+fPosition.z;
	value = sin(frequency*(offset+(value*amplitude)));
	value = (value+1)/2;
	return value;
}

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
#ifdef EFFECT_POSITIONAL	
	INPUT1( vec3, fPosition )
	INPUT3( vec3, fNormal )
	INPUT4( vec3, fTangent )
	INPUT5( vec3, fBitangent )	
#endif
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 sampleCoord = fBufferCoord;

	LayerState state = getLayerState( sampleCoord );

#ifdef EFFECT_POSITIONAL
	float valueA = getTurbulence3D(fPosition * uNoiseScaleA, uNoiseFrequencyA, uNoiseAmplitudeA);
	float valueB = getTurbulence3D(fPosition * uNoiseScaleB, uNoiseFrequencyB, uNoiseAmplitudeB);
	float valueC = getTurbulence3D(fPosition * uNoiseScaleC, uNoiseFrequencyC, uNoiseAmplitudeC);
#else
	float valueA = getTurbulence(sampleCoord * uNoiseScaleA, uNoiseFrequencyA, uNoiseAmplitudeA);
	float valueB = getTurbulence(sampleCoord * uNoiseScaleB, uNoiseFrequencyB, uNoiseAmplitudeB);
	float valueC = getTurbulence(sampleCoord * uNoiseScaleC, uNoiseFrequencyC, uNoiseAmplitudeC);
#endif

	valueA = 1.0f - ((1.0f - valueA)*uNoiseContrastA);
	valueB = 1.0f - ((1.0f - valueB)*uNoiseContrastB);
	valueC = 1.0f - ((1.0f - valueC)*uNoiseContrastC);

	float value = valueA * valueB * valueC;
	//float value = (valueA + valueB + valueC) / 3;
	//float value = (valueA + valueB + valueC);
	//value = fmod(value, 1.0f);

	vec4 outputColor;
	outputColor.x = value;
	outputColor.y = value;
	outputColor.z = value;

	if( uInvertEffect != 0 )
	{
		outputColor.x = 1.0f-outputColor.x;
		outputColor.y = 1.0f-outputColor.y;
		outputColor.z = 1.0f-outputColor.z;
	}

	outputColor = applyGradientMap(outputColor);
	outputColor.w = 1;

	outputColor = lerp( vec4(0.5,0.5,0.5,1.0), outputColor, uContrast );		//amount is noise contrast, i.e. lerp between flat gray and noise

	state.result = outputColor;
	
	OUT_COLOR0 = compositeLayerState( state );		
}

