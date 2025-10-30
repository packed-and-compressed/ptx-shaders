USE_TEXTURE2D_NOSAMPLER( tGBufferFlags );

#define SKIRT_PADDING
#include "layer/skirtPadding.sh"
#include "layer/layernoise.sh"
#include "layer/layerformat.sh"
#include "layer/gbufferflags.sh"

uniform float	uMaxPaddingSDF;
uniform uint2	uGBufferSize;
uniform uint2	uOutputSize;
uniform vec2	uUDIMTile;

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec2 )
END_PARAMS
{
	vec2 gBufferCoord = fBufferCoord;

	#ifdef RENDERTARGET_Y_DOWN
		gBufferCoord.y = 1.0 - gBufferCoord.y;
	#endif

	//read g-buffer flags for island/skirt pixel information
	float tap = imageLoad( tGBufferFlags, uint2( fract(gBufferCoord) * vec2(uGBufferSize) ) ).x;
	int flags = int( tap * 0xFF );

	vec2 uvSpan = vec2( uOutputSize );
	if( flags & GBUFFER_FLAGS_ISLAND_PIXEL )
	{	
		//output direct pixel coords
		uint2 pixelCoord = uint2( frac( fBufferCoord ) * vec2(uvSpan) );
		OUT_COLOR0.xy = vec2( pixelCoord ) / (float)0xFFFF;
		
	}
	else if( !(flags & GBUFFER_FLAGS_DEAD_PIXEL) )
	{
		//output skirt origin pixel coords for a smear
		PaddedPixelDesc pd = getPaddedPixelDesc( fBufferCoord + uUDIMTile );
		uint2 pixelCoord = uint2( frac( pd.originUV.xy - uUDIMTile ) * vec2(uvSpan) );
		OUT_COLOR0.xy = vec2( pixelCoord ) / (float)0xFFFF;
	}
	else
	{
		//output 0xFFFF for pixels lost at sea
		OUT_COLOR0.xy = vec2( 1.0, 1.0 );
	}
}
