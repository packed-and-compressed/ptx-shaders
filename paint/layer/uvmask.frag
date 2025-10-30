#include "gbufferflags.sh"
uniform vec4	uMaskColor;	
uniform uint2	uGBufferSize;
USE_TEXTURE2D_NOSAMPLER( tGBufferFlags );

BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 tc = vec2(fCoord.x, fCoord.y);
	float tap = imageLoad( tGBufferFlags, uint2( fract(tc) * vec2(uGBufferSize) ) ).x;
	int flags = int( tap * 0xFF );

	if( flags & GBUFFER_FLAGS_ISLAND_PIXEL )
	{ discard; }
	else
	{ OUT_COLOR0 = uMaskColor; }
}

