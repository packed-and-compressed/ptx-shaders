///////////////////////////
//setup similar to layer effect shader - called directly from paint code - no frills -MM
#include "layer/layer.sh"
#include "stencilsample.frag"

uniform vec4	uUVRange;//start and end points
uniform vec4	uUVDirections;//normals in either direction

uniform float	uRadialRange;
uniform int		uGradientMode;
uniform int		uBlendExistingAlphas;

uniform vec2	uTileValues;
uniform int		uInvertEffect;
uniform float	uContrast;
uniform mat4	uViewProjectionMatrix;


USE_TEXTURE2D( tTextureColorGradient );
USE_TEXTURE2D( tTextureAlphaGradient );

USE_TEXTURE2D( tTextureOriginalSrc );
USE_TEXTURE2D( tTextureSelectionMask );

vec4 sampleGradientMap(float p)
{
	vec2 gradientSampleCoords = vec2(p, 0);
	vec4 result = texture2DLod( tTextureColorGradient, gradientSampleCoords, 0.0 );
	return result;
}


float gradientSample(vec2 uv)
{
	vec2 coord = uv;
	coord.x = fmod(uv.x, 1);
	coord.y = fmod(uv.y, 1);
	if( coord.x == 0 && uv.x > 0 )
	{ coord.x = 1.0f; }
	if( coord.y == 0 && uv.y > 0 )
	{ coord.y = 1.0f; }
	float result = 0;
	if( uGradientMode == 0 )//linear
	{
		//repeat linear
		result = coord.y;
	}
	else if( uGradientMode == 1 )//radial
	{
		coord.x = fmod(coord.x+0.5f, 1.0f);
		coord.y = fmod(coord.y+0.5f, 1.0f);
		float dx = 0.5f - coord.x;
		float dy = 0.5f - coord.y;
		float len = sqrt((dx*dx)+(dy*dy));
		result = len / 0.5f;
	}
	else if( uGradientMode == 2 )//reflected
	{
		result = coord.y;
	}
	else if( uGradientMode == 3 )//diamond
	{
		coord.x = fmod(coord.x+0.5f, 1.0f);
		coord.y = fmod(coord.y+0.5f, 1.0f);
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
		coord.x = fmod(coord.x+0.5f, 1.0f);
		coord.y = fmod(coord.y+0.5f, 1.0f);
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
	if( result > 1 )
	{ result = 1; }
	return result;
}

float sampleGradient(vec2 uv)
{
	vec2 sampleUV = uv;

	vec2 dir = uUVDirections.xy;
	vec2 sdir = uUVDirections.zw;
	vec2 diff = uv - uUVRange.xy;
	float dist = (diff.x * dir.x) + (diff.y * dir.y);
	float sdist = (diff.x * sdir.x) + (diff.y * sdir.y);
	float value = 1;
	if( uGradientMode == 1 )
	{
		sampleUV.x = (sdist/uRadialRange);
		sampleUV.y = (dist/uRadialRange);
		if( sampleUV.x < 0 )sampleUV.x = -sampleUV.x;
		if( sampleUV.y < 0 )sampleUV.y = -sampleUV.y;
		if( !( sampleUV.x > 1 || sampleUV.y > 1 ) )
		{
			sampleUV.x *= uTileValues.x*0.5f;
			sampleUV.y *= uTileValues.y*0.5f;
			value = gradientSample(sampleUV);
		}
	}
	else if( uGradientMode == 3 || uGradientMode == 4 )
	{
		sampleUV.x = (sdist/uRadialRange);
		sampleUV.y = (dist/uRadialRange);
		if( sampleUV.x < 0 )sampleUV.x = -sampleUV.x;
		if( sampleUV.y < 0 )sampleUV.y = -sampleUV.y;
		sampleUV.x *= uTileValues.x*0.5f;
		sampleUV.y *= uTileValues.y*0.5f;
		value = gradientSample(sampleUV);
	}
	else
	{
		sampleUV.x = (sdist/uRadialRange)+0.5f;
		sampleUV.y = dist/uRadialRange;
		if( uGradientMode == 0 )
		{
			if( sampleUV.x < 0 )sampleUV.x = 0;
			if( sampleUV.y < 0 )sampleUV.y = 0;
		}
		if( uGradientMode == 2 )
		{
			if( sampleUV.x < 0 )sampleUV.x = -sampleUV.x;
			if( sampleUV.y < 0 )sampleUV.y = -sampleUV.y;
		}
		if( sampleUV.x > 1 )sampleUV.x = 1;
		if( sampleUV.y > 1 )sampleUV.y = 1;
		value = gradientSample(sampleUV);
	}

	return value;
}

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	INPUT1( vec3, fPosition )
	INPUT3( vec3, fNormal )
	INPUT4( vec3, fTangent )
	INPUT5( vec3, fBitangent )	
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 fCoord = fBufferCoord;
	vec4 outputColor;
	vec4 selectionMask = texture2DLod( tTextureSelectionMask, fCoord, 0.0 );
	float alphaLerp = selectionMask.x;

	float value = sampleGradient(fCoord);
	outputColor = sampleGradientMap(value);
	if( uInvertEffect != 0 )
	{
		outputColor.x = 1.0f-outputColor.x;
		outputColor.y = 1.0f-outputColor.y;
		outputColor.z = 1.0f-outputColor.z;
	}
	outputColor = lerp( vec4(0.5,0.5,0.5,1.0), outputColor, uContrast );		//amount is noise contrast, i.e. lerp between flat gray and noise
	vec2 gradientSampleCoords = vec2(value, 0);
	vec4 alpha = texture2DLod( tTextureAlphaGradient, gradientSampleCoords, 0.0 );
	vec4 stencilCoord = mulPoint(uViewProjectionMatrix, vec3(fCoord, 0.0));
	float stencil = sampleStencil(stencilCoord.xy);
	alpha *= stencil;

	outputColor.w = alpha.x * alphaLerp; 
	vec4 colorIn = formatBackingColor(uBackingFormat, texture2DLod( tTextureOriginalSrc, fCoord, 0.0 ));
	outputColor = blendRGBA(colorIn, outputColor);

	OUT_COLOR0 = formatOutputColor(uBackingFormat, outputColor);
}
