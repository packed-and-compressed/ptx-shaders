#include "gaussian.sh"
#include "layernoise.sh"

#include "skirtPadding.sh"
#include "scattermask.sh"


USE_TEXTURE2D(tTexture);
USE_TEXTURE2D(tNormal_Tangent);

uniform uint2	uGBufferSize;
uniform vec2	uPixelSize;

uniform int		uPaddingNormalMap;

USE_RAWBUFFER( bAverageColor );

vec4 getBGColor()
{
	vec4 result;
	result.r = float( rawLoad( bAverageColor, 0 ) ) / 0xFF;
	result.g = float( rawLoad( bAverageColor, 1 ) ) / 0xFF;
	result.b = float( rawLoad( bAverageColor, 2 ) ) / 0xFF;
	float count = float( rawLoad( bAverageColor, 3 ) );
	result.rgb /= count;
	result.a = 1.0;
	return result;
}


BEGIN_PARAMS
INPUT0(vec2, fBufferCoord)
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	PaddedPixelDesc pixelDesc = getPaddedPixelDesc( fBufferCoord );
	vec2 gBufferCoord = fBufferCoord;
	#ifdef RENDERTARGET_Y_DOWN
		gBufferCoord.y = 1.0 - gBufferCoord.y;
	#endif

	uint2 loadCoord = uint2( frac(gBufferCoord) * vec2(uGBufferSize) );
	bool teleport = pixelDesc.mapIndex < 0;

	vec2 padSrcUV = teleport ? pixelDesc.sampleUV : fBufferCoord;
	vec4 padSample = texture2D( tTexture, padSrcUV );
	if( uPaddingNormalMap != 0 && teleport )
	{
		vec2 V = radiansToUnitVec2( -pixelDesc.skirtRotation );
		vec2 H = vec2(-V.y, V.x);
		padSample.xy = convertNormalMapXY( padSample.xy, H, V );
	}

	if( pixelDesc.mapIndex == 0 )
	{
		padSample = getBGColor();
	}
	OUT_COLOR0 = padSample;
}

