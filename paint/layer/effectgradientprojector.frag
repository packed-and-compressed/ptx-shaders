#include "effect.frag"

#include "gaussian.sh"
#include "layernoise.sh"


uniform int		uInvertEffect;
uniform float	uScale;
uniform float	uVTiling;
uniform float	uContrast;
uniform int		uGradientMode;

USE_TEXTURE2D( tTextureColorGradient );
USE_TEXTURE2D( tTextureAlphaGradient );

vec4 sampleGradientMap(float p)
{
	vec2 gradientSampleCoords = vec2(p, 0);
	vec4 result = texture2DLod( tTextureColorGradient, gradientSampleCoords, 0.0 );
	return result;
}

float gradientSample(vec2 coord)
{
	float result = 0;
	if( uGradientMode == 0 )//linear
	{
		result = fmod(abs(coord.y), 1.0);
		if( coord.y < 0 )
		{ result = result = 1.0 - result; }
		result *= uScale;
	}
	else if( uGradientMode == 1 )//radial
	{
		if( coord.x < 0 ) coord.x = -coord.x;
		if( coord.y < 0 ) coord.y = -coord.y;
		coord.x = fmod(coord.x * uScale, 1.0f);
		coord.y = fmod(coord.y * uScale, 1.0f);
		float dx = coord.x - 0.5f;
		float dy = coord.y - 0.5f;
		float len = sqrt((dx*dx)+(dy*dy));
		result = len / 0.5f;
		if( result > 1 )
		{ result = 1; }
	}
	else if( uGradientMode == 2 )//reflected
	{
		float originalV = (coord.y / uVTiling);
		float tiledV = fmod(abs(originalV * uVTiling), 1.0f);
		float fromCenter = (0.5f - tiledV);
		result = abs(fromCenter)*2*uScale;
		if( result > 1 )
		{ result = 1; }
	}
	else if( uGradientMode == 3 )//diamond
	{
		if( coord.x < 0 ) coord.x = -coord.x;
		if( coord.y < 0 ) coord.y = -coord.y;
		coord.x = fmod(coord.x * uScale, 1.0f);
		coord.y = fmod(coord.y * uScale, 1.0f);
		float dx = 0.5f - coord.x;
		float dy = 0.5f - coord.y;
		if( dx < 0 )
		{ dx = -dx; }
		if( dy < 0 )
		{ dy = -dy; }
		result = (dx+dy)*2;
	}
	else// ( uGradientMode == 4 )//knurled
	{
		if( coord.x < 0 ) coord.x = -coord.x;
		if( coord.y < 0 ) coord.y = -coord.y;
		coord.x = fmod((coord.x * uScale)+0.5f, 1.0f);
		coord.y = fmod((coord.y * uScale)+0.5f, 1.0f);
		float dx = 0.5f - coord.x;
		float dy = 0.5f - coord.y;
		if( dx < 0 )
		{ dx = -dx; }
		if( dy < 0 )
		{ dy = -dy; }
		result = (dx+dy)*2;
		if( result > 1 )
		{
			dx = 0.5f - dx;
			dy = 0.5f - dy;
			result = (dx+dy)*2;
		}
	}
	return result;
}

float gradientSamplePlanar(vec3 coord)
{
	vec2 uv = projectPlanarCoordinates(coord, uTextureScaleBias, uTextureRotation);
	float result = gradientSample(uv);
	return result;
}

vec4 runEffect(LayerState state)
{
	float value = 0;
#ifdef EFFECT_POSITIONAL
	value = gradientSamplePlanar(state.position);
#else
	value = gradientSample(state.texCoord);
#endif

	if( uInvertEffect != 0 )
	{ value = 1.0f-value; }

	vec4 outputColor = sampleGradientMap(value);
	
	vec2 gradientSampleCoords = vec2(value, 0);
	vec4 alpha = texture2DLod( tTextureAlphaGradient, gradientSampleCoords, 0.0 );

	outputColor = saturate(lerp( vec4(0.5,0.5,0.5,1.0), outputColor, uContrast ));		//amount is noise contrast, i.e. lerp between flat gray and noise

	//newer code - direct map rgb colors and apply alpha
	outputColor.w = alpha.x;
	return outputColor;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{
	return state.result;
}
