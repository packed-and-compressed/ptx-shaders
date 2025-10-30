#ifndef MSET_TEXCOORD_H
#define MSET_TEXCOORD_H

// See MeshBuffer.h : TEXCOORD_PACKING_RANGE == 2.0
#define TEXCOORD_PACKING_RANGE 2.0

bool	areUVsPacked( vec2 packedUVOffsets )
{
	// Basically !isnan, but our own so fast-math does not remove it
	return ( asuint( packedUVOffsets.x ) & 0x7FFFFFFF ) <= 0x7F800000
		&& ( asuint( packedUVOffsets.y ) & 0x7FFFFFFF ) <= 0x7F800000;
}

vec2	decodeUVs( vec2 uvs, vec2 offsets )
{
	if( areUVsPacked( offsets ) )
	{
		return uvs * TEXCOORD_PACKING_RANGE + offsets; 
	}
	return uvs;
}

vec2	decodeHairSecondaryUVs( vec2 uvs, vec2 offsets )
{
	// hair is always unpacked uv and so we are not transforming uvs, 
	// we use the highest bit for the w coordinate and the lower 31 bits for strand id
	// see hairStrandMeshGeometryFactory.comp for secondary uv. 
	const float t = ( ( asuint( uvs.y ) & 0x80000000 ) == 0 ) ? 0.0f : 1.0f;
	return vec2(uvs.x, t );
}

vec2	decodeUVsRaw( uint p, vec2 packedUVOffsets )
{
	vec2 r;
	float c = TEXCOORD_PACKING_RANGE / 65535.0;
	r.x = ((p      ) & 0xFFFF) * c + packedUVOffsets.x;
	r.y = ((p >> 16) & 0xFFFF) * c + packedUVOffsets.y;
	return r;
}

#endif
