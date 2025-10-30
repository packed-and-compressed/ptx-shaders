//inherits "normalMap.frag"

#define NORMALMAP_FLAG_DETAILSCALEANDBIAS     (1u<<10)
#define NORMALMAP_FLAG_DETAILFLIPX            (1u<<11)
#define NORMALMAP_FLAG_DETAILFLIPY            (1u<<12)
#define NORMALMAP_FLAG_DETAILFLIPZ            (1u<<13)

struct	SurfaceDetailNormalMapParams
{
	SurfaceNormalMapParams base;

	uint	detailTexture;
	uint	detailWeightTexture;
	uint	detailTiling;
	float	detailWeight;
};

vec4 	ProcessDetailNormalSample( vec4 value, uint flags )
{
	vec4 v = vec4( value.xyz, 1 );
	
	HINT_FLATTEN
	if( flags & NORMALMAP_FLAG_DETAILSCALEANDBIAS )
	{ v.xyz = 2.0 * v.xyz - 1.0; }

	v.x = flags & NORMALMAP_FLAG_DETAILFLIPX ? -v.x : v.x;
	v.y = flags & NORMALMAP_FLAG_DETAILFLIPY ? -v.y : v.y;
	v.z = flags & NORMALMAP_FLAG_DETAILFLIPZ ? -v.z : v.z;
		
	return v;
}

vec4	ApplyDetailNormalTexCoordTransforms( vec4 uv, uint detailTiling )
{
	uv.xy   = scaleAndBias( uv.xy, detailTiling );
	#ifdef MATERIAL_TEXTURE_GRADS
		uv.zw   = scaleTextureGrads( f16tof32(detailTiling), uv.zw );
	#endif
	return uv;
}

void	SurfaceDetailNormalMap( in SurfaceDetailNormalMapParams p, in uvec3 texCoordTransform, inout MaterialState m, inout FragmentState s )
{
    SurfaceNormalMap( p.base, texCoordTransform, m, s );
	
	//ortho-normalization of new tangent basis
	vec3 T = s.vertexTangent;
	vec3 B = s.vertexBitangent;
	vec3 N = m.normal;
	T -= dot(T,N)*N;
	T = normalize(T);
	B -= dot(B,N)*N + dot(B,T)*T;
	B = normalize(B);
	
	vec3 dn;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	vec4 uvX = ApplyDetailNormalTexCoordTransforms( m.vertexTexCoord.projectorCoord.uvX, p.detailTiling );
	vec4 uvY = ApplyDetailNormalTexCoordTransforms( m.vertexTexCoord.projectorCoord.uvY, p.detailTiling );
	vec4 uvZ = ApplyDetailNormalTexCoordTransforms( m.vertexTexCoord.projectorCoord.uvZ, p.detailTiling );
						
	vec4 tapX = textureMaterial( p.detailTexture, uvX, vec4(0.5, 0.5, 1.0, 1.0) );
	vec4 tapY = textureMaterial( p.detailTexture, uvY, vec4(0.5, 0.5, 1.0, 1.0) );
	vec4 tapZ = textureMaterial( p.detailTexture, uvZ, vec4(0.5, 0.5, 1.0, 1.0) );
		
	// apply scaling, bias
	tapX = ProcessDetailNormalSample( tapX, p.base.flags );
	tapY = ProcessDetailNormalSample( tapY, p.base.flags );
	tapZ = ProcessDetailNormalSample( tapZ, p.base.flags );
				
	// move taps to the object space
	projectTaps( tapX, tapY, tapZ, m.vertexTexCoord.projectorCoord, N );
	vec4 tap = triplanarMix( m.vertexTexCoord.projectorCoord, tapX, tapY, tapZ );
		
	// detail normal map taps are in object space, move them to shading space
	dn = mulVec( m.vertexTexCoord.projectorToShadingRotation, tap.xyz );
	//apply UV rotation
	dn = mulVec( axisRotation( N, unpackVec2f( texCoordTransform.z ) ), dn );
#else
    vec4 uv = ApplyDetailNormalTexCoordTransforms( m.vertexTexCoord.uvCoord, p.detailTiling );
	vec4 tap = textureMaterial( p.detailTexture, uv, vec4(0.5, 0.5, 1.0, 1.0) );
	dn = ProcessDetailNormalSample( tap, p.base.flags ).xyz;

	//apply UV rotation in tangent space
	dn = rotateVecUV( dn, unpackVec2f( texCoordTransform.z ) );
	//transform to shading space
	dn = dn.x * T + dn.y * B + dn.z * N;
#endif

	//blend in the detail normal
	float detailWeight = textureMaterial( p.detailWeightTexture, m.vertexTexCoord, 1.0 );
	detailWeight *= p.detailWeight;
	m.normal = normalize( m.normal + dn * detailWeight );
}

#undef  SurfaceParams
#undef  Surface
#define SurfaceParams		SurfaceDetailNormalMapParams
#define Surface(p,m,s)		SurfaceDetailNormalMap(p.surface,p.texCoordTransform,m,s)

