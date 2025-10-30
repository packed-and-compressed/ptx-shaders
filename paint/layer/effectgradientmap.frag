#include "gaussian.sh"
#include "effect.frag"

USE_TEXTURE2D( tTextureColorGradient );
USE_TEXTURE2D( tTextureAlphaGradient );

uniform int		uSRGBInput;

float invertGradient( float color, float invert )
{
	// lerp( color, 1-color, t );
	// (1-t)*color + t*(1-color)
	// t*(-2*color + 1) + color;
	return (invert * ((-2.0*color) + 1.0)) + color;
}

vec3 invertGradient( vec3 color, float invert )
{
	return (invert * ((-2.0*color) + vec3(1.0,1.0,1.0))) + color;
}

vec4 sampleGradientMap(float p)
{
	vec2 gradientSampleCoords = vec2(p, 0.0);
	vec4 result = texture2DLod( tTextureColorGradient, gradientSampleCoords, 0.0 );
	return result;
}

vec4 applyGradientMap(vec4 color)
{	
#define PRESERVE_RGB 1
#if		PRESERVE_RGB
	//preserve relative RGB so color images can map to default gradient (grayscale 0 to 1)
	vec4 colorGradientR = sampleGradientMap(color.x);
	vec4 colorGradientG = sampleGradientMap(color.y);
	vec4 colorGradientB = sampleGradientMap(color.z);
	color.x = colorGradientR.x;
	color.y = colorGradientG.y;
	color.z = colorGradientB.z;
#else
	float avg = (color.x + color.y + color.z)/3.0;//condense input to grayscale
	color = sampleGradientMap(avg);
#endif
	return color;
}

vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.bufferCoord;
	vec4 colorIn = state.layerBacking;

	if( uSRGBInput != 0 )
	{
		colorIn.x = linearTosRGB( colorIn.x );
		colorIn.y = linearTosRGB( colorIn.y );
		colorIn.z = linearTosRGB( colorIn.z );
	}

	float avg = (colorIn.x + colorIn.y + colorIn.z)/3.0;

	vec4 colorOut = applyGradientMap(colorIn);

	vec2 gradientSampleCoords = vec2(avg, 0.0);
	
	vec4 alpha = texture2DLod( tTextureAlphaGradient, gradientSampleCoords, 0.0 );
	
	colorOut.w = alpha.x * colorIn.a;
	return colorOut;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }

