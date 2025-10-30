#include "data/shader/common/util.sh"
#include "data/shader/common/packed.sh"
#include "data/shader/mat/state.frag"

#define NORMALMAP_FLAG_OBJECTSPACE      (1u<<0)
#define NORMALMAP_FLAG_NORMALADJUST     (1u<<1)
#define NORMALMAP_FLAG_SCALEANDBIAS     (1u<<2)
#define NORMALMAP_FLAG_FLIPX            (1u<<3)
#define NORMALMAP_FLAG_FLIPY            (1u<<4)
#define NORMALMAP_FLAG_FLIPZ            (1u<<5)
#define NORMALMAP_FLAG_GENZ             (1u<<6)
#define NORMALMAP_FLAG_RENORMALIZE      (1u<<7)
#define NORMALMAP_FLAG_ORTHOGONALIZE    (1u<<8)
#define NORMALMAP_FLAG_GENBITANGENT     (1u<<9)

#ifdef SurfaceShadingSpaceNonWorld
uniform mat4 uSurfaceNormalMapWorldToShading;
#endif

struct	SurfaceNormalMapParams
{
	uint texture;
	uint flags;
};

vec4 	ProcessNormalSample( vec4 value, uint flags )
{
	vec4 v = vec4( value.xyz, 1 );
	
	HINT_FLATTEN
	if( flags & NORMALMAP_FLAG_SCALEANDBIAS )
	{ v.xyz = 2.0 * v.xyz - 1.0; }

	v.x = flags & NORMALMAP_FLAG_FLIPX ? -v.x : v.x;
	v.y = flags & NORMALMAP_FLAG_FLIPY ? -v.y : v.y;
	v.z = flags & NORMALMAP_FLAG_FLIPZ ? -v.z : v.z;
	
	HINT_FLATTEN
	if( flags & NORMALMAP_FLAG_GENZ )
	{ v.z = sqrt( saturate( 1.0 - dot(v.xy,v.xy) ) ); }

	return v;
}

void	SurfaceNormalMap( in SurfaceNormalMapParams p, in uvec3 texCoordTransform, inout MaterialState m, inout FragmentState s )
{
	vec3 T = s.vertexTangent;
	vec3 B = s.vertexBitangent;
	vec3 N = s.vertexNormal;

#ifdef SurfaceFlipBackfacingNormals
	if( !s.frontFacing )
	{ N = -N; }
#endif
	
	//ortho-normalization
	float renormalize   = p.flags & NORMALMAP_FLAG_RENORMALIZE ? 1.0 : 0.0;
	float orthogonalize = p.flags & NORMALMAP_FLAG_ORTHOGONALIZE ? 1.0 : 0.0;
	float genbitangent  = p.flags & NORMALMAP_FLAG_GENBITANGENT ? 1.0 : 0.0;
	
	N = mix( N, normalize(N), renormalize );
	T -= (orthogonalize * dot(T,N)) * N;
	T = mix( T, normalize(T), renormalize );
	vec3 orthB = orthogonalize * (dot(B,N)*N + dot(B,T)*T);
		// don't subtract if it results in 0, which can't be normalized:
		float valueNonZero = float(any(greaterThan( abs(B - orthB), vec3(0.0,0.0,0.0) )));
		B -= orthB * valueNonZero;
	B = mix( B, normalize(B), renormalize );
	
	//regenerate bitangent
	vec3 B2 = cross( N, T );
	B2 = dot(B2,B) < 0.0 ? -B2 : B2;
	B = mix( B, B2, genbitangent );
    
	vec2 rotation = unpackVec2f( texCoordTransform.z );
	
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	//sample and scale/bias the normal map
	vec4 nsampX = textureMaterial( p.texture, m.vertexTexCoord.projectorCoord.uvX, vec4(0.5, 0.5, 1.0, 1.0) );
	vec4 nsampY = textureMaterial( p.texture, m.vertexTexCoord.projectorCoord.uvY, vec4(0.5, 0.5, 1.0, 1.0) );
	vec4 nsampZ = textureMaterial( p.texture, m.vertexTexCoord.projectorCoord.uvZ, vec4(0.5, 0.5, 1.0, 1.0) );
	
	vec4 nX = ProcessNormalSample( nsampX, p.flags );
	vec4 nY = ProcessNormalSample( nsampY, p.flags );
	vec4 nZ = ProcessNormalSample( nsampZ, p.flags );
		
	// object/tangent space switch
	HINT_FLATTEN
	if( !( p.flags & NORMALMAP_FLAG_OBJECTSPACE ) )
	{
		// we have taps in the tangent space - we need to transform them to object space so we can mix them
		projectTaps( nX, nY, nZ, m.vertexTexCoord.projectorCoord );
	}
	
	// at this point we always have all taps in object space
	vec3 n = triplanarMix( m.vertexTexCoord.projectorCoord, nX, nY, nZ ).xyz;
	n = mulVec( m.vertexTexCoord.projectorToShadingRotation, n );

	//apply UV rotation
	n = mulVec( axisRotation( N, unpackVec2f( texCoordTransform.z ) ), n );
#else
	vec4 nsamp = textureMaterial( p.texture, m.vertexTexCoord.uvCoord, vec4( 0.5, 0.5, 1.0, 1.0 ) );
	vec3 n = ProcessNormalSample( nsamp, p.flags ).xyz;
		
	//object-space switch
	HINT_FLATTEN
	if( p.flags & NORMALMAP_FLAG_OBJECTSPACE )
	{
		//transform from object to tangent space
		n = mulVec( s.transformInverseTranspose, n );
	#ifdef SurfaceShadingSpaceNonWorld
		n = mulVec( submatrix3x3(uSurfaceNormalMapWorldToShading), n );
	#endif
		n = vec3( dot( n, T ), dot( n, B ), dot( n, N ) );
	}

	//apply UV rotation in tangent space
	n = rotateVecUV( n, unpackVec2f( texCoordTransform.z ) );
	//transform to shading space
	n = n.x*T + n.y*B + n.z*N;
#endif
	
	//store our results
	m.normal = normalize( n );
	m.normalAdjust = p.flags & NORMALMAP_FLAG_NORMALADJUST;

	//FIXME: when should these be written? ~ms	
    s.vertexTangent = T;
    s.vertexBitangent = B;
    s.vertexNormal = N;
}

void	SurfaceNormalMapMerge( in MaterialState m, inout FragmentState s )
{
#ifdef SurfaceFlipBackfacingNormals
	if( !s.frontFacing )
	{
		s.vertexNormal    = -s.vertexNormal;
		s.geometricNormal = -s.geometricNormal;
	}
#endif

	s.normal = m.normal;
	if( m.normalAdjust )
	{
		//reduce normal adjustment strength when normal map is present so that we get some shadowing from normal maps
		s.normalAdjust = 0.7;
	}
}

#define SurfaceParams 			SurfaceNormalMapParams
#define	Surface(p,m,s) 			SurfaceNormalMap(p.surface,p.texCoordTransform,m,s)
#define SurfaceMerge			SurfaceNormalMapMerge
#define SurfaceMergeFunction	SurfaceNormalMapMerge
