#include "../common/util.sh"
#include "../common/udim.sh"
#include "../common/globalTextures.sh"

#define CHANNEL_COUNT_MASK (3u<<30)

USE_SAMPLER( sSampler );
uniform uint	uMaps[UDIM_MAX_TILES_IN_SHAPE];
uniform vec2	uMapSizes[UDIM_MAX_TILES_IN_SHAPE];
uniform uint2	uShape;

USE_TEXTURE2D( tBackground );

uniform vec4	uChannelMask;
uniform float	uLinearPreviewGamma;
uniform vec4	uMaterialUvScaleBias;
uniform vec2	uMaterialUvRotation;
uniform float	uUseAlphaTesting;
uniform uint	uUseAlphaBackground;
uniform uint	uUseUDIMRepeatFallback;

void resolveUDIMValues( vec2 texCoord, out uint mapIndex, out int channelCount, out vec2 mapSize )
{
	uint arrayOffset;
	if( calculateUDIMArrayOffset( texCoord.xy, uShape.x, uShape.y, arrayOffset ) )
	{
		uint encodedMapIndex = uMaps[arrayOffset];
		mapIndex = encodedMapIndex & (~CHANNEL_COUNT_MASK);
        channelCount = ( ( encodedMapIndex & CHANNEL_COUNT_MASK ) >> 30 ) + 1;
		mapSize = uMapSizes[arrayOffset];
	}
	else
	{
		mapIndex = 0;
		channelCount = 4;
		mapSize = vec2( 0, 0 );
	}
}

vec3 sRGBToLinear( vec3 srgb )
{
	vec3 black = srgb * 0.0773993808;	
	vec3 lin = (srgb + vec3(0.055,0.055,0.055)) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin.r = srgb.r <= 0.04045 ? black.r : lin.r;
	lin.g = srgb.g <= 0.04045 ? black.g : lin.g;
	lin.b = srgb.b <= 0.04045 ? black.b : lin.b;
	
	return lin;
}

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	INPUT1(vec3,fPosition)
	INPUT2(vec3,fNormal)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 texCoord = transformUV( fTexCoord, uMaterialUvScaleBias, uMaterialUvRotation );

	uint mapIndex;
	int channelCount;
	vec2 mapSize;
	resolveUDIMValues( texCoord, mapIndex, channelCount, mapSize );

	if( mapIndex == 0 && uUseUDIMRepeatFallback )
	{
		//fallback: if we get no good udim index, try udim 0,0 (basically tiling this image)
		resolveUDIMValues( vec2(0,0), mapIndex, channelCount, mapSize );
	}

	vec4 back = texture2D( tBackground, fTexCoord * ( ( 1.0 / 16.0 ) * mapSize ) );
	vec4 top = textureWithSampler( resourceByIndex( tGlobalTextures, mapIndex ), sSampler, texCoord.xy );

	if( channelCount == 1 )
	{
		float col = dot( top, uChannelMask );
		top = vec4( col, col, col, 1.0f );
	}
	if( channelCount == 2 )
	{
		top = vec4( top.r, top.r, top.r, top.g );
	}

	if(uUseAlphaTesting == 1.0 && top.a < 1.0/255.0)
	{ discard; }
	if( !uUseAlphaBackground )
	{ top.a = 1.0; }
	
	//alpha blend
	vec4 outColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	outColor.rgb = mix( back.rgb, top.rgb, top.a );
	outColor.rgb = mix( outColor.rgb, sRGBToLinear(outColor.rgb), uLinearPreviewGamma );
	OUT_COLOR0 = outColor;
}
	
