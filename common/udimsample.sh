#ifndef COMMON_UDIM_SAMPLE
#define COMMON_UDIM_SAMPLE

#include "udim.sh"
#include "globalTextures.sh"

#define CHANNEL_COUNT_MASK (3u<<30)

USE_SAMPLER( sUDIMSampler );
uniform uint	uMaps[UDIM_MAX_TILES_IN_SHAPE];
uniform vec2	uMapSizes[UDIM_MAX_TILES_IN_SHAPE];
uniform uint2	uShape;

void resolveUDIMValues( uint arrayOffset, out uint mapIndex, out int channelCount, out vec2 mapSize )
{
	uint encodedMapIndex = uMaps[arrayOffset];
	mapIndex = encodedMapIndex & (~CHANNEL_COUNT_MASK);
	channelCount = (encodedMapIndex & CHANNEL_COUNT_MASK) >> 30;
	mapSize = uMapSizes[arrayOffset];
}

void resolveUDIMValues( vec2 texCoord, out uint mapIndex, out int channelCount, out vec2 mapSize )
{
	uint arrayOffset;
	if( calculateUDIMArrayOffset( texCoord.xy, uShape.x, uShape.y, arrayOffset ) )
	{
		resolveUDIMValues( arrayOffset, mapIndex, channelCount, mapSize );
	}
	else
	{
		mapIndex = 0;
		channelCount = 4;
		mapSize = vec2( 0, 0 );
	}
}

vec4 sampleUDIM( vec2 texCoord )
{
	uint mapIndex;
	int channelCount;
	vec2 mapSize;
	resolveUDIMValues( texCoord, mapIndex, channelCount, mapSize );

	return textureWithSampler( resourceByIndex( tGlobalTextures, mapIndex ), sUDIMSampler, texCoord );
}

vec4 sampleUDIM( vec2 texCoord, vec4 defaultColor )
{
	uint mapIndex;
	int channelCount;
	vec2 mapSize;
	resolveUDIMValues( texCoord, mapIndex, channelCount, mapSize );

	vec4 color = defaultColor;
	if( mapIndex )
	{ color = textureWithSampler( resourceByIndex( tGlobalTextures, mapIndex ), sUDIMSampler, texCoord ); }

	return color;
}

#endif
