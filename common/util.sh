#ifndef MSET_UTIL_H
#define MSET_UTIL_H

#include "const.sh"
#include "texcoord.sh"

vec3	mulVec( mat4 m, vec3 v )
{
	return col0(m).xyz*v.x + (col1(m).xyz*v.y + (col2(m).xyz*v.z));
}

vec3	mulVec( mat3x4 m, vec3 v )
{
	return mul( m, vec4(v, 0.0) );
}

vec3	mulVec( mat3 m, vec3 v )
{
	return mul( m, v );
}

vec4	mulPoint( mat4 m, vec3 p )
{
	return col0(m)*p.x + (col1(m)*p.y + (col2(m)*p.z + col3(m)));
}

vec3	mulPoint( mat3x4 m, vec3 p )
{
	return mul( m, vec4(p, 1.0) );
}

vec3	mulPointPrecise( mat3x4 m, precise vec3 p )
{
	precise vec3 tp;
	tp.x = col3_xyz(m)[0] + mad( col0_xyz(m)[0], p.x, mad( col1_xyz(m)[0], p.y, col2_xyz(m)[0] * p.z ) );
	tp.y = col3_xyz(m)[1] + mad( col0_xyz(m)[1], p.x, mad( col1_xyz(m)[1], p.y, col2_xyz(m)[1] * p.z ) );
	tp.z = col3_xyz(m)[2] + mad( col0_xyz(m)[2], p.x, mad( col1_xyz(m)[2], p.y, col2_xyz(m)[2] * p.z ) );
	return tp;
}

mat3	transpose3x3( mat3x4 m )
{
	//return transpose of 3x3 submatrix of m
	return mat3(
		m[0][0], m[1][0], m[2][0],
		m[0][1], m[1][1], m[2][1],
		m[0][2], m[1][2], m[2][2]	
	);
}

mat3x4	submatrix3x4( mat4 m )
{
	//return submatrix 3x4 of matrix m
	#ifdef CPR_METAL
		return mat3x4(
			m[0][0], m[0][1], m[0][2],
			m[1][0], m[1][1], m[1][2],
			m[2][0], m[2][1], m[2][2],
			m[3][0], m[3][1], m[3][2]
		);
	#else
		return mat3x4(
			m[0][0], m[0][1], m[0][2], m[0][3],
			m[1][0], m[1][1], m[1][2], m[1][3],
			m[2][0], m[2][1], m[2][2], m[2][3]
		);
	#endif
}

mat3	submatrix3x3( mat4 m )
{
	//return submatrix 3x3 of matrix m
	#ifdef CPR_METAL
		return mat3(
			m[0][0], m[0][1], m[0][2],
			m[1][0], m[1][1], m[1][2],
			m[2][0], m[2][1], m[2][2]
		);
	#else
		return mat3(
			m[0][0], m[0][1], m[0][2],
			m[1][0], m[1][1], m[1][2],
			m[2][0], m[2][1], m[2][2]
		);
	#endif
}

mat3	submatrix3x3( mat3x4 m )
{
	//return submatrix 3x3 of matrix m
	#ifdef CPR_METAL
		return mat3(
			m[0][0], m[0][1], m[0][2],
			m[1][0], m[1][1], m[1][2],
			m[2][0], m[2][1], m[2][2]
		);
	#else
		return mat3(
			m[0][0], m[0][1], m[0][2],
			m[1][0], m[1][1], m[1][2],
			m[2][0], m[2][1], m[2][2]
		);
	#endif
}

mat4	expandToMat4( mat3x4 m )
{
	// Expands a 3x4 matrix to a 4x4 matrix
	#ifdef CPR_METAL
		return mat4(
			m[0][0], m[0][1], m[0][2], 0,
			m[1][0], m[1][1], m[1][2], 0,
			m[2][0], m[2][1], m[2][2], 0,
			m[3][0], m[3][1], m[3][2], 1
		);
	#else
		return mat4( m, vec4( 0, 0, 0, 1 ) );
	#endif
}

// Compute the inverse of a 3x3 matrix
mat3 inverse(mat3 m)
{
    const float inv_det = 1.0f / determinant(m);
    mat3 result;
    result[0][0] = (m[1][1] * m[2][2] - m[1][2] * m[2][1]) * inv_det;
    result[0][1] = (m[0][2] * m[2][1] - m[0][1] * m[2][2]) * inv_det;
    result[0][2] = (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * inv_det;
    result[1][0] = (m[1][2] * m[2][0] - m[1][0] * m[2][2]) * inv_det;
    result[1][1] = (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * inv_det;
    result[1][2] = (m[0][2] * m[1][0] - m[0][0] * m[1][2]) * inv_det;
    result[2][0] = (m[1][0] * m[2][1] - m[1][1] * m[2][0]) * inv_det;
    result[2][1] = (m[0][1] * m[2][0] - m[0][0] * m[2][1]) * inv_det;
    result[2][2] = (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * inv_det;
    return result;
}

mat3	mat3_colmajor( vec3 c0, vec3 c1, vec3 c2 )
{
	mat3 m = mat3( c0, c1, c2 );
#if defined(CPR_D3D)
	m = transpose( m );
#endif
	return m;
}

mat3 	mat3_rowmajor( vec3 r0, vec3 r1, vec3 r2 )
{
	mat3 m = mat3( r0, r1, r2 );
#if defined(CPR_METAL)
	m = transpose( m );
#endif
	return m;
}

mat3	absMat( mat3 m )
{
#if defined(CPR_METAL)
	return mat3( abs(m[0]), abs(m[1]), abs(m[2]) );
#else
	return abs( m );
#endif
}

mat3x4	absMat( mat3x4 m )
{
#if defined(CPR_METAL)
	return mat3x4( abs(m[0]), abs(m[1]), abs(m[2]), abs(m[3]) );
#else
	return abs( m );
#endif
}

vec3	reflectVec( vec3 I, vec3 N )
{
	return -I + 2.0 * dot( N, I ) * N;
}

bool	refractVec( vec3 I, vec3 N, float eta, out vec3 T )
{
	float cosThetaI  = dot( N, I );
	float sin2ThetaT = eta * eta * saturate( 1.0 - cosThetaI*cosThetaI );
	if( sin2ThetaT >= 1.0 )
	{
		//total internal reflection
		T = vec3( 0.0, 0.0, 0.0 );
		return false;
	}
	else
	{
		float cosThetaT = sqrt( saturate( 1.0 - sin2ThetaT ) );
		T = eta * -I + ( eta * cosThetaI - cosThetaT ) * N;
		return true;
	}
}

float	average( vec3 v )
{
	return (1.0/3.0) * ( v.x + v.y + v.z );
}

float	maxcomp( vec3 v )
{
	return max( max( v.x, v.y ), v.z );
}

float	luminance( vec3 color )
{
	//relative luminance; expects linear RGB input (ITU BT.709)
	return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

half	rcpSafe( half v )
{
	return v != 0.0 ? rcp( v ) : 0.0;
}

float	rcpSafe( float v )
{
	return v != 0.0 ? rcp( v ) : 0.0;
}

vec3	rcpSafe( vec3 v )
{
	vec3 inv = rcp( v );
	return vec3(
		v.x != 0.0 ? inv.x : 0.0,
		v.y != 0.0 ? inv.y : 0.0,
		v.z != 0.0 ? inv.z : 0.0
	);
}

vec3	rcpSafeInf( vec3 v )
{
	vec3 inv = rcp( v );
	return vec3(
		v.x != 0.0 ? inv.x : INFINITY,
		v.y != 0.0 ? inv.y : INFINITY,
		v.z != 0.0 ? inv.z : INFINITY
	);
}

vec3	normalizeSafe( vec3 v )
{
	float len2 = dot( v, v );
	return len2 > 0.0
		? v * rsqrt( len2 )
		: vec3(0.0, 0.0, 0.0);
}

float asinSafe( float v )
{
	return asin( clamp( v, -1.0, 1.0 ) );
}

float sqrtSafe( float v )
{
	return sqrt( max( 0.0, v ) );
}

vec3	normalizeAndGetScale( vec3 v, out float scale )
{
	scale = rsqrt( dot( v, v ) );
	return v * scale;
}

vec3	oneminus( vec3 v )
{
	return saturate( vec3( 1.0-v.x, 1.0-v.y, 1.0-v.z ) );
}

uint	getVecOctant( vec3 v )
{
	return ( v.x < 0.0 ? 4 : 0 ) | ( v.y < 0.0 ? 2 : 0 ) | ( v.z < 0.0 ? 1 : 0 );
}

vec3	decodeUint101010Normalized( vec3 v )
{
	return (2.0*(1023.0/1022.0))*v - vec3(1.0,1.0,1.0);
}

vec3	decodeUint101010NormalizedRaw( uint p )
{
	vec3 r;
	float c = (2.0/1022.0);
	r.x = float((p      ) & 0x3FF) * c - 1.0;
	r.y = float((p >> 10) & 0x3FF) * c - 1.0;
	r.z = float((p >> 20) & 0x3FF) * c - 1.0;
	return r;
}

float	clampUV( float u, float texelSize )
{
	return clamp( u, 0.5*texelSize, 1.0 - 0.5*texelSize );
}

vec2	clampUV( vec2 uv, vec2 texelSize )
{
	return vec2( clampUV(uv.x, texelSize.x), clampUV(uv.y, texelSize.y) );
}

float	wrapMirroredUV( float u )
{
	return int(floor(u)) & 1 ? saturate( 1.0 - frac(u) ) : frac(u);
}

vec2	wrapMirroredUV( vec2 uv )
{
	return vec2( wrapMirroredUV(uv.x), wrapMirroredUV(uv.y) );
}

vec2 	transformUV( vec2 uv, vec2 scale, vec2 bias, vec2 rotation )
{
#ifdef TRANSFORMUV_ORDER_PAINT
	//bias
	uv = uv + bias;
	
	//rotation around bias-(0.5,0.5)
	uv = uv - vec2( 0.5, 0.5 );
	uv = vec2( uv.x * rotation.x - uv.y * rotation.y,
			   uv.x * rotation.y + uv.y * rotation.x );
	uv = uv + vec2( 0.5, 0.5 );

	//scale
	uv = uv * scale;
#else
	//rotation around (0.5,0.5)
	uv = uv - vec2( 0.5, 0.5 );
	uv = vec2( uv.x * rotation.x - uv.y * rotation.y,
			   uv.x * rotation.y + uv.y * rotation.x );
	uv = uv + vec2( 0.5, 0.5 );

	//scale & bias
	uv = scale * uv + bias;
#endif
	return uv;
}

vec2 	transformUV( vec2 uv, vec4 scaleBias, vec2 rotation )
{
	return transformUV( uv, scaleBias.xy, scaleBias.zw, rotation );
}

vec2 	transformUV( vec2 uv, uint3 encodedTransform )
{
	vec2 scale;
	scale.x = f16tof32(encodedTransform.x);
	scale.y = f16tof32(encodedTransform.x>>16);

	vec2 bias;
	bias.x = f16tof32(encodedTransform.y);
	bias.y = f16tof32(encodedTransform.y>>16);
	
	vec2 rotation;
	rotation.x = f16tof32(encodedTransform.z);
	rotation.y = f16tof32(encodedTransform.z>>16);

	return transformUV( uv, scale, bias, rotation );
}

ushort	hashXOR8( ushort value )
{
	ushort h = value;
	h = ( h & 0xFF ) ^ ( h >> 8 );
	return h;
}

ushort	hashXOR8( uint value )
{
	uint h = value;
	h = ( h & 0xFFFF ) ^ ( h >> 16 );
	h = ( h & 0xFF   ) ^ ( h >> 8  );
	return ushort( h );
}

ushort	hashXOR16( uint value )
{
	uint h = value;
	h = ( h & 0xFFFF ) ^ ( h >> 16 );
	return ushort( h );
}

//returns rotation matrix around normalized axis vector `v`
mat3	axisRotation( vec3 v, vec2 rotation )
{
	float angleCos = rotation.x;
	float angleSin = rotation.y;
    float oneMinusCos = 1.0 - angleCos;
    return mat3(
		v.x * v.x * oneMinusCos + angleCos,			v.x * v.y * oneMinusCos + v.z * angleSin,	v.x * v.z * oneMinusCos - v.y * angleSin,
		v.x * v.y * oneMinusCos - v.z * angleSin,   v.y * v.y * oneMinusCos + angleCos,			v.y * v.z * oneMinusCos + v.x * angleSin,
		v.x * v.z * oneMinusCos + v.y * angleSin,   v.y * v.z * oneMinusCos - v.x * angleSin,	v.z * v.z * oneMinusCos + angleCos
	);
}

//apply UV rotation to sampled tangent-space vector (for normal maps etc)
vec3	rotateVecUV( vec3 v, vec2 rotation )
{
	return vec3( v.x * rotation.x + v.y * rotation.y,
	            -v.x * rotation.y + v.y * rotation.x,
				 v.z );
}

#endif
