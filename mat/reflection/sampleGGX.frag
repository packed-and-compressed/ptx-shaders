#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/microfacet.comp"
#include "data/shader/scene/raytracing/bsdf/regularize.comp"

#include "fresnelGGX.frag"

void	ReflectionGGXEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness  = saturate( 1.0 - _p(fs.gloss) );
	float alpha      = roughness * roughness;
	float bsdfWeight = fs.reflectionOcclusion;
	float pdfWeight  = _p(ss.reflectionWeight);

	if( path.isNonSpecular )
	{ regularizeGGX( alpha ); }

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
	evaluateBRDF_GGX( ss, _p(fs.reflectivity), _p(fs.fresnel), alpha, HdotV, eta, bsdfWeight, pdfWeight );
}

void	ReflectionGGXSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = saturate( 1.0 - _p(fs.gloss) );
	float alpha     = roughness * roughness;

	if( path.isNonSpecular )
	{ regularizeGGX( alpha ); }

	sampleBRDF_GGX( ss, alpha );
	ss.flagSpecular = isSpecularGGX( alpha );
	ss.specularity  = _p(fs.gloss) * fs.metalness;
}

#ifdef SUBROUTINE_SECONDARY
	#define ReflectionEvaluateSecondary	ReflectionGGXEvaluateSecondary
	#define ReflectionSampleSecondary	ReflectionGGXSampleSecondary
	#define ReflectionFresnelSecondary	ReflectionGGXFresnelSecondary
#else
	#define ReflectionEvaluate			ReflectionGGXEvaluate
	#define ReflectionSample			ReflectionGGXSample
	#define ReflectionFresnel			ReflectionGGXFresnel
#endif
