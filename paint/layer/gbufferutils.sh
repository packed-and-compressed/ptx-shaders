#include "gbufferflags.sh"

#ifndef GBUFFER_UTILS_SH
#define GBUFFER_UTILS_SH

#ifdef USE_PIXEL_MASK

uniform uint2	uGBufferSize;
USE_TEXTURE2D_NOSAMPLER( tGBufferFlags );

bool isInUVIsland(uint2 gbufferCoords)
{
	#ifdef RENDERTARGET_Y_DOWN
		gbufferCoords.y = (uGBufferSize.y - 1) - gbufferCoords.y;
	#endif

	float tap = imageLoad( tGBufferFlags, gbufferCoords ).x;
	int flags = int( tap * 0xFF );

	return ( flags & GBUFFER_FLAGS_ISLAND_PIXEL );
}

bool isInUVIslandFromFCoords(vec2 uv)
{
	return isInUVIsland( uint2( fract(uv) * vec2(uGBufferSize) ) );
}

bool comparePixelType(uint2 gbufferCoords, uint pxType)
{
	#ifdef RENDERTARGET_Y_DOWN
		gbufferCoords.y = (uGBufferSize.y - 1) - gbufferCoords.y;
	#endif

	float tap = imageLoad( tGBufferFlags, gbufferCoords ).x;
	int flags = int( tap * 0xFF );

	return ( flags & pxType);
}

bool comparePixelTypeFromFCoords(vec2 uv, uint pxType)
{
	return comparePixelType( uint2( fract(uv) * vec2(uGBufferSize) ), pxType );
}

#else

bool isInUVIsland(uint2 gbufferCoords) { return true; }
bool isInUVIslandFromFCoords(vec2 uv)  { return true; }

#endif // USE_PIXEL_MASK

#endif //  GBUFFER_UTILS_SH
