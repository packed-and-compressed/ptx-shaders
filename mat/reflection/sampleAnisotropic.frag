#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/mat/reflection/fresnelGGX.frag"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"
#include "data/shader/scene/raytracing/bsdf/microfacet.comp"
#include "data/shader/scene/raytracing/bsdf/regularize.comp"


void	ReflectionAnisoGGXPrecompute( in ReflectionAnisoGGXParams p, inout MaterialState m, in FragmentState s )
{
	uint swapXY = p.directionTexture & ANISOGGX_FLAG_SWAPXY;
	vec2 xrot = vec2( f16tof32(p.rotation), f16tof32(p.rotation>>16) );
	vec2 yrot = vec2( -xrot.y, xrot.x );
	
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR	
	vec4 dirX = textureMaterial( p.directionTexture, m.vertexTexCoord.projectorCoord.uvX, vec4(0.0, 0.5, 0, 1) );
	vec4 dirY = textureMaterial( p.directionTexture, m.vertexTexCoord.projectorCoord.uvY, vec4(0.0, 0.5, 0, 1) );
	vec4 dirZ = textureMaterial( p.directionTexture, m.vertexTexCoord.projectorCoord.uvZ, vec4(0.0, 0.5, 0, 1) );
			
	dirX.xy = anisoScaleRotateAndBias( dirX.xy, swapXY, p.directionScaleBias, xrot, yrot );
	dirY.xy = anisoScaleRotateAndBias( dirY.xy, swapXY, p.directionScaleBias, xrot, yrot );
	dirZ.xy = anisoScaleRotateAndBias( dirZ.xy, swapXY, p.directionScaleBias, xrot, yrot );
		
	projectTaps( dirX, dirY, dirZ, m.vertexTexCoord.projectorCoord );
	
	vec3 dir = triplanarMix( m.vertexTexCoord.projectorCoord, dirX, dirY, dirZ ).xyz;
#else
    vec3 dir = textureMaterial( p.directionTexture, m.vertexTexCoord.uvCoord, vec4( 0.0, 0.5, 0.0, 0.0 ) ).xyz;
	dir.xy = anisoScaleRotateAndBias( dir.xy, swapXY, p.directionScaleBias, xrot, yrot );
#endif
	
	_p(m.anisoDirection) = dir;
	_p(m.anisoAspect) = p.aspect;
}

void	ReflectionAnisoGGXPrecomputeMerge( in MaterialState m, inout FragmentState s )
{
    _p(s.anisoDirection) = _p(m.anisoDirection);
    _p(s.anisoAspect) = _p(m.anisoAspect);
}

void	ReflectionAnisoGGXEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = 1.0 - _p(fs.gloss);
	vec3 a = anisoRoughnessToA( roughness, _p(fs.anisoAspect) );
	
	vec3 basisX, basisY;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	anisoGetBasis( ss.basis, fs.vertexTexCoord.projectorToShadingRotation, _p(fs.anisoDirection), basisX, basisY );
#else
	anisoGetBasis( ss.basis, _p(fs.anisoDirection), basisX, basisY );
#endif

	float bsdfWeight = fs.reflectionOcclusion;
	float pdfWeight  = _p(ss.reflectionWeight);

	if( path.isNonSpecular )
	{ regularizeAnisoGGX( a ); }

	// this is a fix for coating with a specular reflective + refractive bottom layer, the underlying issue 
	// is that coating was calculating TIR when the ray is inside a medium, this causes a black border when
	// there is a mis-match between coating IOR and specular IOR, or an energy gain when there is high bottom layer
	// roughness. This fix stops the fresnel from getting TIR for the coating layer.
#ifdef SUBROUTINE_SECONDARY
	float HdotV = abs( dot( ss.H, ss.V ) );
	float eta = fs.frontFacing ? _p( fs.eta ) : rcpSafe( _p( fs.eta ) );
#else
	float HdotV = dot( ss.H, ss.V );
	float eta = _p( fs.eta );
#endif
	evaluateBRDF_AnisoGGX(	ss, _p(fs.reflectivity), _p(fs.fresnel), eta,
							a.z, a.x, a.y, HdotV, basisX, basisY, bsdfWeight, pdfWeight );
}

void	ReflectionAnisoGGXSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = 1.0 - _p(fs.gloss);
	vec3 a = anisoRoughnessToA( roughness, _p(fs.anisoAspect) );
	
	vec3 basisX, basisY;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	anisoGetBasis( ss.basis, fs.vertexTexCoord.projectorToShadingRotation, _p(fs.anisoDirection), basisX, basisY );
#else
	anisoGetBasis( ss.basis, _p(fs.anisoDirection), basisX, basisY );
#endif

	if( path.isNonSpecular )
	{ regularizeAnisoGGX( a ); }

	sampleBRDF_AnisoGGX( ss, a.x, a.y, basisX, basisY );
	ss.flagSpecular = isSpecularGGX( a.z );
	ss.specularity  = _p(fs.gloss) * fs.metalness;
}

#ifdef SUBROUTINE_SECONDARY
	#define ReflectionPrecomputeSecondary(p,m,s)	ReflectionAnisoGGXPrecomputeSecondary(p.reflectionSecondary,m,s)
	#define ReflectionPrecomputeMergeSecondary      ReflectionAnisoGGXPrecomputeMergeSecondary
	#define ReflectionEvaluateSecondary				ReflectionAnisoGGXEvaluateSecondary
	#define ReflectionSampleSecondary				ReflectionAnisoGGXSampleSecondary
	#define ReflectionFresnelSecondary				ReflectionGGXFresnelSecondary
#else
	#define ReflectionPrecompute(p,m,s)				ReflectionAnisoGGXPrecompute(p.reflection,m,s)
	#define ReflectionPrecomputeMerge				ReflectionAnisoGGXPrecomputeMerge
	#define ReflectionEvaluate						ReflectionAnisoGGXEvaluate
	#define ReflectionSample						ReflectionAnisoGGXSample
	#define ReflectionFresnel						ReflectionGGXFresnel
#endif
