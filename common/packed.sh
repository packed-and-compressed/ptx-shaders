#ifndef MSET_PACKED_H
#define MSET_PACKED_H

#ifdef CPR_METAL

struct packed_mat3x4
{
	packed_vec3 c0, c1, c2, c3;
};
packed_mat3x4 pack( mat3x4 m )
{
	packed_mat3x4 p;
	p.c0 = m[0];
	p.c1 = m[1];
	p.c2 = m[2];
	p.c3 = m[3];
	return p;
}
mat3x4 unpack( packed_mat3x4 p )
{
	return mat3x4( p.c0, p.c1, p.c2, p.c3 );
}

#else //D3D12

struct packed_mat3x4
{
	mat3x4 m;
};
packed_mat3x4 pack( mat3x4 m )
{
	packed_mat3x4 p;
	p.m = m;
	return p;
}
mat3x4 unpack( packed_mat3x4 p )
{
	return p.m;
}

#endif

uint packUnitFloat( float v )
{
	return uint(v * 65535.0)/* & 0xFFFF */;
}

float unpackUnitFloat( uint p )
{
	return float(p /*& 0xFFFF*/) * (1.0/65535.0);
}

uint packUnitVec2f( vec2 v )
{
	return (packUnitFloat(v.x) & 0xFFFF) | (packUnitFloat(v.y) << 16);
}

vec2 unpackUnitVec2f( uint p )
{
	return vec2(unpackUnitFloat(p & 0xFFFF), unpackUnitFloat(p >> 16));
}

uint packVec2f( vec2 v )
{
	return ( f32tof16( v.x ) << 16 ) | f32tof16( v.y );
}

vec2 unpackVec2f( uint p )
{
	vec2 v;
	v.x = f16tof32( p >> 16 );
	v.y = f16tof32( p & 0xFFFF );
	return v;
}

uint2 packVec3f( vec3 v )
{
	uint2 p;
	p.x = f32tof16(v.x) | (f32tof16(v.y)<<16);
	p.y = asuint(v.z);
	return p;
}

vec3 unpackVec3f( uint2 p )
{
	return vec3( f16tof32(p.x), f16tof32(p.x>>16), asfloat(p.y) );
}

uint2 packVec4f( vec4 v )
{
	uint2 p;
	p.x = (f32tof16(v.x)<<16) | f32tof16(v.y);
	p.y = (f32tof16(v.z)<<16) | f32tof16(v.w);
	return p;
}

uint2 packVec4h( half4 v )
{
	uint2 p;
	p.x = (f32tof16(v.x)<<16) | f32tof16(v.y);
	p.y = (f32tof16(v.z)<<16) | f32tof16(v.w);
	return p;
}

vec4 unpackVec4f( uint2 p )
{
	vec4 v;
	v.x = f16tof32(p.x>>16);
	v.y = f16tof32(p.x    );
	v.z = f16tof32(p.y>>16);
	v.w = f16tof32(p.y    );
	return v;
}

half4 unpackVec4h( uint2 p )
{
	half4 v;
	v.x = half(f16tof32(p.x>>16));
	v.y = half(f16tof32(p.x    ));
	v.z = half(f16tof32(p.y>>16));
	v.w = half(f16tof32(p.y    ));
	return v;
}

uint3 packVec2x3f( vec3 v1, vec3 v2 )
{
	uint3 p;
	p.x = f32tof16(v1.x) | (f32tof16(v1.y)<<16);
	p.y = f32tof16(v1.z) | (f32tof16(v2.x)<<16);
	p.z = f32tof16(v2.y) | (f32tof16(v2.z)<<16);
	return p;
}

void unpackVec2x3f( uint3 p, out vec3 v1, out vec3 v2 )
{
	v1 = vec3( f16tof32(p.x),     f16tof32(p.x>>16), f16tof32(p.y) );
	v2 = vec3( f16tof32(p.y>>16), f16tof32(p.z),     f16tof32(p.z>>16) );
}

void addPackedVec4f( inout uint2 p, vec3 v )
{
	uint x16 = f32tof16(f16tof32(p.x>>16) + v.x)<<16;
	uint y16 = f32tof16(f16tof32(p.x    ) + v.y);
	uint z16 = f32tof16(f16tof32(p.y>>16) + v.z)<<16;
	uint w16 = p.y & 0xFFFF;
	p.x = x16 | y16;
	p.y = z16 | w16;
}

void addPackedVec4fW( inout uint2 p, float w )
{
	uint z16 = p.y & 0xFFFF0000;
	uint w16 = f32tof16(f16tof32(p.y) + w);
	p.y = z16 | w16;
}

void mulPackedVec4fSetW( inout uint2 p, float s, float w )
{
	uint x16 = f32tof16(f16tof32(p.x>>16) * s)<<16;
	uint y16 = f32tof16(f16tof32(p.x    ) * s);
	uint z16 = f32tof16(f16tof32(p.y>>16) * s)<<16;
	uint w16 = f32tof16(w);
	p.x = x16 | y16;
	p.y = z16 | w16;
}

#ifdef CPR_METAL
void addPackedVec4f( device uint2& p, vec3 v )
{
	uint x16 = f32tof16(f16tof32(p.x>>16) + v.x)<<16;
	uint y16 = f32tof16(f16tof32(p.x    ) + v.y);
	uint z16 = f32tof16(f16tof32(p.y>>16) + v.z)<<16;
	uint w16 = p.y & 0xFFFF;
	p.x = x16 | y16;
	p.y = z16 | w16;
}

void addPackedVec4fW( device uint2& p, float w )
{
	uint z16 = p.y & 0xFFFF0000;
	uint w16 = f32tof16(f16tof32(p.y) + w);
	p.y = z16 | w16;
}

void mulPackedVec4fSetW( device uint2& p, float s, float w )
{
	uint x16 = f32tof16(f16tof32(p.x>>16) * s)<<16;
	uint y16 = f32tof16(f16tof32(p.x    ) * s);
	uint z16 = f32tof16(f16tof32(p.y>>16) * s)<<16;
	uint w16 = f32tof16(w);
	p.x = x16 | y16;
	p.y = z16 | w16;
}
#endif

#endif //MSET_PACKED_H
