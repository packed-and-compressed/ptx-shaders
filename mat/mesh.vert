#ifndef MSET_MESH_COMP
#define MSET_MESH_COMP

#include <data/shader/common/meshBuffer.comp>
#include <data/shader/common/tangentbasis.sh>
#include <data/shader/mat/state.vert>

//random mesh attribute access for manual vertex pulling in VS

USE_RAWBUFFER(bMeshVertices);
USE_RAWBUFFER(bMeshVertexColors);
USE_RAWBUFFER(bMeshSecondaryUVs);
USE_RAWBUFFER(bMeshIndices);
uniform uint uMeshBaseIndex;

#define MESH_FLAG_INDICES16BIT  0x80000000
#define MESH_FLAG_SECONDARYUVS  0x40000000
#define MESH_FLAG_VERTEXCOLORS  0x20000000
#define MESH_FLAG_FROMCURVES    0x10000000
uniform uint uMeshFlags;

VertexState meshLoadVertex( uint index, vec2 texCoord0Offsets, vec2 texCoord1Offsets )
{
	uint vindex = vertexIndexToMeshBufferOffset( index, texCoord0Offsets );
	uint4 line1 = rawLoad4(bMeshVertices,vindex);
	uint3 line2;
	if( areUVsPacked( texCoord0Offsets ) )
	{
		line2.xy = rawLoad2(bMeshVertices,vindex+4);
		line2.z = 0.0;
	}
	else
	{
		line2 = rawLoad3(bMeshVertices,vindex+4);
	}

	VertexState s;
	s.rasterPosition.w = 1.0;
	s.rasterPosition.xyz =
	s.position = asfloat(line1.xyz);
	s.tangent = decodeUint101010NormalizedRaw(line1.w);

	float handedness = unpackHandednessRaw(line1.w);
	s.normal = decodeUint101010NormalizedRaw(line2.x);
	s.bitangent = reconstructBitangent( s.tangent, s.normal, handedness );
	if( areUVsPacked( texCoord0Offsets ) )
	{
		s.texCoord.uvCoord.xy = decodeUVsRaw( line2.y, texCoord0Offsets );
	}
	else
	{
		s.texCoord.uvCoord.xy = asfloat(line2.yz);
	}

	s.texCoord.uvCoord.zw = s.texCoord.uvCoord.xy;
	if( uMeshFlags & MESH_FLAG_SECONDARYUVS )
	{
		if( areUVsPacked( texCoord1Offsets ) )
		{
			s.texCoord.uvCoord.zw = decodeUVsRaw( rawLoad(bMeshSecondaryUVs,index), texCoord1Offsets );
		}
		else
		{
			const uint2 secondaryUVData = rawLoad2(bMeshSecondaryUVs, index*2);
			if(uMeshFlags & MESH_FLAG_FROMCURVES)
			{
				// we use the highest bit for the w coordinate and the lower 31 bits for strand id
				// see hairStrandMeshGeometryFactory.comp for secondary uv 
				const float t = ( ( secondaryUVData.y & 0x80000000 ) == 0 ) ? 0.0f : 1.0f;
				s.texCoord.uvCoord.zw = vec2( asfloat( secondaryUVData.x ), t );
			}
			else
			{
				s.texCoord.uvCoord.zw = asfloat( secondaryUVData );
			}
		}
	}

	s.color = vec4(1.0,1.0,1.0,1.0);
	if( uMeshFlags & MESH_FLAG_VERTEXCOLORS )
	{
		uint c = rawLoad( bMeshVertexColors, index );
		s.color.r = float((c    ) & 0xFF);
		s.color.g = float((c>> 8) & 0xFF);
		s.color.b = float((c>>16) & 0xFF);
		s.color.a = float((c>>24)       );
		s.color *= 1.0/255.0;
	}

	return s;
}

uint	meshLoadIndex( uint index )
{
	index += uMeshBaseIndex;
	if( uMeshFlags & MESH_FLAG_INDICES16BIT )
	{
		//16-bit load
		uint r = index & 1;
		index >>= 1;
		uint word = rawLoad( bMeshIndices, index );
		return r > 0 ? uint(word >> 16) : uint(word & 0xFFFF);
	}
	else
	{
		//32-bit load
		return rawLoad( bMeshIndices, index );
	}
}

#endif
