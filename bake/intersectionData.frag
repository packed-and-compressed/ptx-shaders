#ifndef MSET_INTERSECTION_DATA_FRAG
#define MSET_INTERSECTION_DATA_FRAG

#include "../mat/mesh.comp"
#include "../common/util.sh"
#include "hit.frag"

USE_TEXTURE2D(tIntersections);
uniform uint	uHitBaryBits, uHitTriIndexBits;
uniform float	uHitBaryDivisor;

struct SrcMeshInfo
{
	MeshBinding	meshBinding;
	uint		materialID;
	uint		materialShadingGroupID;
	mat4		transform;
	mat4		transformInvTranspose;
};
USE_STRUCTUREDBUFFER(SrcMeshInfo,bSrcMeshInfo);

struct SrcMatInfo
{
	float		bevelRadius;
};

vec2	loadPackedHit( uint2 pixelCoord )
{
	return imageLoad( tIntersections, pixelCoord ).xy;
}

uint	extractPackedHit( uint bitcount, inout uint hi, inout uint lo )
{
	uint mask = (1U << bitcount) - 1;
	uint r = lo & mask;
	lo >>= bitcount;
	lo |= (hi & mask) << (32-bitcount);
	hi >>= bitcount;
	return r;
}

bool	hitMatchesGroup( vec2 packedHit, uint meshIndexStart, uint meshIndexEnd )
{
	uint ix = asuint( packedHit.x ) >> (2*uHitBaryBits + uHitTriIndexBits - 32);
	return ix >= meshIndexStart && ix < meshIndexEnd;
}

bool	loadIntersection( out BakeHit h, uint2 pixelCoord, vec2 packedHit )
{
	//placeholder dst values
	h.dstPosition = h.dstTangent = h.dstBitangent = h.dstNormal = vec3(0,0,0);
	h.dstPixelCoord = pixelCoord;
	h.dstTexCoord = vec2(0,0);
	h.output0 = vec4(0,0,0,0);

	//load hit data
	bool didhit = false;
	{
		uint hi = asuint( packedHit.x ), lo = asuint( packedHit.y );

		h.rayWasSent = (hi != 0 || lo != 0);
		
		vec2 bary;
		bary.y = float( extractPackedHit( uHitBaryBits, hi, lo ) ) * uHitBaryDivisor;
		bary.x = float( extractPackedHit( uHitBaryBits, hi, lo ) ) * uHitBaryDivisor;
		h.hitBarycenter = saturate( vec3( 1.0-bary.x-bary.y, bary.x, bary.y ) );

		h.hitTriangleIndex = extractPackedHit( uHitTriIndexBits, hi, lo );
		didhit = (h.hitTriangleIndex > 0);
		h.hitTriangleIndex -= 1;

		h.hitMeshIndex = lo;
	}

	HINT_BRANCH
	if( didhit )
	{
		//load vertex data for the hit location
		SrcMeshInfo nfo = bSrcMeshInfo[ h.hitMeshIndex ];

		uint3 tri = loadTriangle( nfo.meshBinding, h.hitTriangleIndex );
		Vertex v0 = loadVertex( nfo.meshBinding, tri.x );
		Vertex v1 = loadVertex( nfo.meshBinding, tri.y );
		Vertex v2 = loadVertex( nfo.meshBinding, tri.z );
		Vertex v = interpolateVertex(	h.hitBarycenter.yz,
										v0, v1, v2	);

		h.hitPosition = mulPoint( nfo.transform, v.position ).xyz;
		h.hitNormal = normalize( mulVec( nfo.transformInvTranspose, v.normal ) );
		h.hitTangent = normalize( mulVec( nfo.transform, v.tangent ) );
		h.hitBitangent = normalize( mulVec( nfo.transform, v.bitangent ) );
		h.hitGeometricNormal = normalize( mulVec( nfo.transform, cross( v1.position-v0.position, v2.position-v0.position ) ) );
		h.hitTexCoord	= v.texcoord;
		h.hitColor		= v.color;
		h.hitMaterialID = nfo.materialID;
		h.hitShadingGroupObjectID = nfo.materialShadingGroupID;
		h.hitTransform = nfo.transform;
		h.hitTransformInverseTranspose = nfo.transformInvTranspose;
	}
	else
	{
		//placeholder hit info
		h.hitMaterialID = 0;
		h.hitShadingGroupObjectID = 0;
		h.hitPosition = vec3(0,0,0);
		h.hitTangent = vec3(1,0,0);
		h.hitBitangent = vec3(0,1,0);
		h.hitGeometricNormal =
		h.hitNormal = vec3(0,0,1);
		h.hitTexCoord = vec2(0,0);
		h.hitColor = vec4(1,1,1,1);
		h.hitTransform =
		h.hitTransformInverseTranspose =
			mat4(	1,0,0,0,
					0,1,0,0,
					0,0,1,0,
					0,0,0,1	);
	}

	return didhit;
}

#endif
