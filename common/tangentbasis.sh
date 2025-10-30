#ifndef MSET_TANGENTBASIS_H
#define MSET_TANGENTBASIS_H

#include "const.sh"

struct TangentBasis
{
	vec3 T; // tangent (X)
	vec3 B; // bitangent (Y)
	vec3 N; // normal (Z)
};

//create tangent basis from individual vectors
TangentBasis createTangentBasis( vec3 tangent, vec3 bitangent, vec3 normal )
{
    TangentBasis basis;
    basis.T = tangent;
    basis.B = bitangent;
    basis.N = normal;
    return basis;
}

//create tangent basis around normal vector
TangentBasis createTangentBasis( vec3 normal )
{
	TangentBasis basis;

	HINT_FLATTEN
	if( normal.x != normal.y || normal.x != normal.z )
	{
		basis.T = cross( normal, vec3(1.0,1.0,1.0) );
	}
	else
	{
		basis.T = cross( normal, vec3(-1.0,1.0,1.0) );
	}
	basis.N = normal;
	basis.T = normalize( basis.T );
	basis.B = cross( basis.T, basis.N );
	return basis;
}

//create tangent basis around normal vector given tangent vector that might not be orthogonal
TangentBasis createTangentBasis( vec3 normal, vec3 tangent )
{
	vec3  B     = cross( normal, tangent );
	float Blen2 = dot( B, B );
	if( Blen2 == 0.0 )
	{
		//tangent is colinear; use normal vector only
		return createTangentBasis( normal );
	}

	TangentBasis basis;
	basis.N = normal;
	basis.B = B * rsqrt( Blen2 );
	basis.T = cross( basis.B, basis.N );
	return basis;
}

//create tangent basis around normal vector, oriented by some unit direction vector
//tangent vector in this basis is constructed by rejection of direction vector on normal vector
TangentBasis createTangentBasisDir( vec3 normal, vec3 direction )
{
	TangentBasis basis;
	basis.N = normal;
	const float nDotD = dot(direction, normal);
	if( abs( nDotD ) >= 0.999999f )
	{
		// the direction is collinear with the normal, this gives us problematic tangent, 
		// and therefore bitangent
		return createTangentBasis( normal );
	}
	basis.T = normalize( direction - normal * dot(direction, normal) );
	basis.B = cross( basis.N, basis.T );
	return basis;
}

vec3 transformVecTo( TangentBasis basis, vec3 v )
{
	return vec3( dot( basis.T, v ), dot( basis.B, v ), dot( basis.N, v ) );
}

vec3 transformVecFrom( TangentBasis basis, vec3 v )
{
	return basis.T * v.x + basis.B * v.y + basis.N * v.z;
}

void	interpolateTangentBasis( inout vec3 tangent, inout vec3 bitangent, inout vec3 normal, vec3 tangentParams )
{
#ifdef LAYER_COMPUTE
	//this step is not necessary with g-buffers because the tangent basis can be baked into them 
	return;
#endif

	vec3 T = tangent, B = bitangent, N = normal;

	// Vertex Normal / Tangent / Bitangent
	float renormalize = tangentParams.x;
	float orthogonalize = tangentParams.y;
	float generateBi = tangentParams.z;

	N = mix( N, normalize( N ), renormalize );
	T -= ( orthogonalize * dot( T, N ) ) * N;
	T = mix( T, normalize( T ), renormalize );
	vec3 orthB = orthogonalize * ( dot( B, N ) * N + dot( B, T ) * T );
	// don't subtract if it results in 0, which can't be normalized:
	float valueNonZero = float( any( greaterThan( abs( B - orthB ), vec3( 0.0, 0.0, 0.0 ) ) ) ) ;
	B -= orthB * valueNonZero;
	B = mix( B, normalize(B), renormalize );

	//regenerate bitangent
	vec3 B2 = cross( N, T );
	B2 = dot( B2, B ) < 0.0 ? -B2 : B2;
	B = mix( B, B2, generateBi );

	tangent = T;
	bitangent = B;
	normal = N;
}

vec3 reconstructBitangent( vec3 tangent, vec3 normal, float encodedHandedness )
{
	vec3 B = cross( normal, tangent );
	if( dot(B,B) < FLT_EPSILON )
	{
		// A vector orthogonal to both normal and tangent when, either one
		// is zero or they are parallel to each other. If both are zero
		// it is zero too.
		B = normalize( vec3(-normal.y, normal.x + tangent.z, -tangent.y) );
	}

	// The encoded handedness from input-assembler is either a 0 or 1 represented via a 2-bit normalized uint.
	// So it can have a value of 0.0 or (1.0 / 3.0) in the shader.
	// 1.0 / 3.0 corresponds to B, 0.0 corresponds to -B.
	// 
	// The encoded handedness read from a raw byte buffer can have a value of 0.0 or 1.0 in the shader.
	// 1.0 corresponds to B, 0.0 corresponds to -B.
	// The below covers both.
	return encodedHandedness > 0.0 ? B : -B;
}

#endif
