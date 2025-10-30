USE_TEXTURE2D_NOSAMPLER( tGBufferFlags );
USE_RAWBUFFER( bAverageColor );

#define SKIRT_PADDING
#include "skirtPadding.sh"
#include "gbufferflags.sh"

uniform uint2	uGBufferSize;

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 gBufferCoord = fBufferCoord;

	#ifdef RENDERTARGET_Y_DOWN
		gBufferCoord.y = 1.0 - gBufferCoord.y;
	#endif

	//read g-buffer flags for island/skirt pixel information
	float tap = imageLoad( tGBufferFlags, uint2( fract(gBufferCoord) * vec2(uGBufferSize) ) ).x;
	int flags = int( tap * 0xFF );

	if( (flags & GBUFFER_FLAGS_DEAD_PIXEL) == 0 )
	{
		discard;
	}

	//average color
	vec4 result;
	result.r = float( rawLoad( bAverageColor, 0 ) ) / 0xFF;
	result.g = float( rawLoad( bAverageColor, 1 ) ) / 0xFF;
	result.b = float( rawLoad( bAverageColor, 2 ) ) / 0xFF;
	float count = float( rawLoad( bAverageColor, 3 ) );
	result.rgb /= count;
	result.a = 1.0;
	
	OUT_COLOR0 = result;
}
