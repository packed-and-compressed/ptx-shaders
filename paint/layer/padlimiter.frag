#include "data/shader/common/colorspace.sh"
#include "layernoise.sh"

USE_TEXTURE2D_NOSAMPLER( tTexture );
USE_TEXTURE2D_NOSAMPLER( tPaddingMask );

USE_RAWBUFFER( bAverageColor );

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec4 result = vec4(0.0,0.0,1.0,1.0);
    vec4 tap = imageLoad( tPaddingMask, uint2(IN_POSITION.xy) );
    uint4 limiter = uint4( tap * 0xFFFF );

	if( limiter.x >= 0xFFFF )
	{
		//average color
		result.r = float( rawLoad( bAverageColor, 0 ) ) / 0xFF;
		result.g = float( rawLoad( bAverageColor, 1 ) ) / 0xFF;
		result.b = float( rawLoad( bAverageColor, 2 ) ) / 0xFF;
		float count = float( rawLoad( bAverageColor, 3 ) );
		result.rgb /= count;
		result.a = 1.0;
	}
	else
	{
		result = imageLoad( tTexture, limiter.xy );
	}
	
#ifdef PAD_OUTPUT_DITHER	
	#ifdef PAD_OUTPUT_SRGB
	result.rgb = linearTosRGB( result.rgb );
	#endif

	result.rgb = layerDither8bit( result.rgb, IN_POSITION.xy );
	
	#ifdef PAD_OUTPUT_SRGB
	result.rgb = sRGBToLinear(result.rgb);
	#endif
#endif

	OUT_COLOR0 = result;
}
