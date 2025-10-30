#ifndef SKIRT_PADDING_INCLUDED
#define SKIRT_PADDING_INCLUDED

#include "data/shader/common/util.sh"
#include "padpixeltypes.sh"
#include "gbufferflags.sh"

struct PackedMat3
{
	packed_vec3 r0;
	packed_vec3 r1;
	packed_vec3 r2;
};

#ifdef BINDLESS

#include "data/shader/common/udim.sh"
#include "data/shader/common/globalBuffers.sh"
#include "data/shader/common/globalTextures.sh"
uniform uint	uRasterIslandPixelsBuffers[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uRasterSkirtPixelsBuffers[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uRasterSkirtReorientations[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uRasterSkirtIndexMaps[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uGBufferFlags[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uGBufferMapSizes[UDIM_MAX_TILES_IN_SHAPE * 2];

uniform uint2	uPaddingLUTShape;

#else

USE_BUFFER(uint2, bRasterIslandPixelsBuffer);
USE_STRUCTUREDBUFFER(RasterSkirtPixelDesc, bRasterSkirtPixelsBuffer);
USE_STRUCTUREDBUFFER(PackedMat3, bRasterSkirtReorientations);
USE_TEXTURE2D_NOSAMPLER( tRasterSkirtIndexMap );

#endif

struct	PaddedPixelDesc
{
	vec2	sampleUV;
	vec2	originUV;
	float	islandsdf;
	float	skirtRotation;
	uint	triangleIndex;
	uint	groupIndex;
	int		mapIndex;
};

#ifdef BINDLESS

// compute the offset we need to look into the buffers based on the tiles
uint	getBufferAddress( vec2 texCoord )
{
	uint bufferAddress = ~0u;
	if( calculateUDIMArrayOffset( texCoord.xy, uPaddingLUTShape.x, uPaddingLUTShape.y, bufferAddress ) )
	{
		return bufferAddress;
	}
	return ~0u;
}

//> 0 == raster pixel
//< 0 == skirt pixel
//  0 == blank pixel
int		getRasterPixelMapIndex( vec2 uv, out uint bufferAdress )
{
	bufferAdress = getBufferAddress( uv );
	if( bufferAdress != ~0u && uRasterSkirtIndexMaps[bufferAdress] )
	{
		uint w = uGBufferMapSizes[bufferAdress * 2 + 0];
		uint h = uGBufferMapSizes[bufferAdress * 2 + 1];

		uint2 loadCoord = uint2(frac(uv) * vec2(w, h));
		float fvalue = imageLoad(resourceByIndex( tGlobalTextures, uRasterSkirtIndexMaps[bufferAdress] ), loadCoord).x;
		int ivalue = asint(fvalue);
		return ivalue;
	}
	return 0;
}

RasterIslandPixelDesc	getRasterIslandPixelDesc( int mapIndexValue, uint bufferAdress )
{
	uint2 r = uint2( 0, 0 );
	if( uRasterIslandPixelsBuffers[bufferAdress] )
	{ r = rawLoad2( resourceByIndex( bGlobalBuffers, uRasterIslandPixelsBuffers[bufferAdress] ), (mapIndexValue - 1) * 2 ); }

	RasterIslandPixelDesc desc;
	desc.triangleIndex = r.x;
	desc.groupIndex = r.y & 0xffff;
	desc.sdf = float(r.y >> 16) * (1.0/65535.0);
	return desc;
}

RasterSkirtPixelDesc getRasterSkirtPixelDesc( int mapIndexValue, uint bufferAdress )
{	
	if( uRasterSkirtPixelsBuffers[bufferAdress] )
	{
		return rawLoadT( resourceByIndex( bGlobalBuffers, uRasterSkirtPixelsBuffers[bufferAdress] ), ((-mapIndexValue)-1) * 8, RasterSkirtPixelDesc );
	}
	RasterSkirtPixelDesc desc;
	desc.remoteUV = vec2( 0.0, 0.0 );
	desc.originUV = vec2( 0.0, 0.0 );
	desc.triangleIndex = 0;
	desc.groupIndex = 0;
	desc.tangentRotation = 0.0;
	desc.unused = 0;
	return desc;
}

mat3	getRasterSkirtReorientation( int mapIndexValue, int bufferAdress )
{
	PackedMat3 m;
	m.r0 = packed_vec3( 0.0, 0.0, 0.0 );
	m.r1 = packed_vec3( 0.0, 0.0, 0.0 );
	m.r2 = packed_vec3( 0.0, 0.0, 0.0 );
	if( uRasterSkirtReorientations[bufferAdress] )
	{
		m = rawLoadT(resourceByIndex( bGlobalBuffers, uRasterSkirtReorientations[bufferAdress] ), ((-mapIndexValue)-1) * 9, PackedMat3 );
	}
	return mat3_colmajor( m.r0, m.r1, m.r2 );
}

PaddedPixelDesc getPaddedPixelDesc( vec2 sampleCoord )
{
	uint bufferAddress;
	int pixelMapIndex = getRasterPixelMapIndex( sampleCoord, bufferAddress );
	PaddedPixelDesc result;
	result.sampleUV = sampleCoord;
	result.originUV = sampleCoord;
	result.islandsdf = 0;
	result.skirtRotation = 0;
	result.triangleIndex = 0;
	result.groupIndex = 0;
	result.mapIndex = pixelMapIndex;
	if( pixelMapIndex > 0 )
	{
		RasterIslandPixelDesc d = getRasterIslandPixelDesc( pixelMapIndex , bufferAddress );
		result.triangleIndex = d.triangleIndex;
		result.groupIndex = d.groupIndex;
		result.islandsdf = d.sdf;
	}
	else if( pixelMapIndex < 0 )
	{
		RasterSkirtPixelDesc d = getRasterSkirtPixelDesc( pixelMapIndex, bufferAddress );
		result.sampleUV = d.remoteUV;
		result.originUV = d.originUV;
		result.triangleIndex = d.triangleIndex;
		result.groupIndex = d.groupIndex;
		result.skirtRotation = d.tangentRotation;
	}
	return result;
}

#else

//> 0 == raster pixel
//< 0 == skirt pixel
//  0 == blank pixel
int		getRasterPixelMapIndex( vec2 uv )
{
	//TODO - use some agreed on global var that all shaders will use
	int w=0, h=0, mips=0;
	imageSize2D(tRasterSkirtIndexMap, w, h, mips);
	uint2 loadCoord = uint2(frac(uv) * vec2(w, h));
	float fvalue = imageLoad(tRasterSkirtIndexMap, loadCoord).x;
	int ivalue = asint(fvalue);
	return ivalue;
}

RasterIslandPixelDesc	getRasterIslandPixelDesc( int mapIndexValue )
{
	uint2 r = bRasterIslandPixelsBuffer[mapIndexValue-1];

	RasterIslandPixelDesc desc;
	desc.triangleIndex = r.x;
	desc.groupIndex = r.y & 0xffff;
	desc.sdf = float(r.y >> 16) * (1.0/65535.0);
	return desc;
}

RasterSkirtPixelDesc getRasterSkirtPixelDesc( int mapIndexValue )
{
	return bRasterSkirtPixelsBuffer[(-mapIndexValue)-1];
}

mat3	getRasterSkirtReorientation( int mapIndexValue )
{
	PackedMat3 m = bRasterSkirtReorientations[(-mapIndexValue)-1];
	return mat3_colmajor( m.r0, m.r1, m.r2 );
}

PaddedPixelDesc getPaddedPixelDesc( vec2 sampleCoord )
{
	int pixelMapIndex = getRasterPixelMapIndex( sampleCoord );
	PaddedPixelDesc result;
	result.sampleUV = sampleCoord;
	result.originUV = sampleCoord;
	result.islandsdf = 0;
	result.skirtRotation = 0;
	result.triangleIndex = 0;
	result.groupIndex = 0;
	result.mapIndex = pixelMapIndex;
	if( pixelMapIndex > 0 )
	{
		RasterIslandPixelDesc d = getRasterIslandPixelDesc( pixelMapIndex );
		result.triangleIndex = d.triangleIndex;
		result.groupIndex = d.groupIndex;
		result.islandsdf = d.sdf;
	}
	else if( pixelMapIndex < 0 )
	{
		RasterSkirtPixelDesc d = getRasterSkirtPixelDesc( pixelMapIndex );
		result.sampleUV = d.remoteUV;
		result.originUV = d.originUV;
		result.triangleIndex = d.triangleIndex;
		result.groupIndex = d.groupIndex;
		result.skirtRotation = d.tangentRotation;
	}
	return result;
}

#endif

#endif
