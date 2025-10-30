#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/microfacet.comp"
#include "data/shader/scene/raytracing/bsdf/regularize.comp"

#if defined(RT_TRANSMISSION_ANISO)
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"

void	TransmissionAnisoGGXEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = 1.0 - fs.glossTransmission;
	vec3 a = anisoRoughnessToA( roughness, fs.anisoAspect );
	
	vec3 basisX, basisY;
	anisoGetBasis( ss.basis, fs.anisoDirection, basisX, basisY );
	
	if( path.isNonSpecular )
	{ regularizeAnisoGGX( a ); }

	evaluateBTDF_AnisoGGX(	ss,
							fs.transmissivity, fs.eta,
							a.z, a.x, a.y,
							basisX, basisY	);
}

void	TransmissionAnisoGGXSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = 1.0 - fs.glossTransmission;
	vec3 a = anisoRoughnessToA( roughness, fs.anisoAspect );
	
	vec3 basisX, basisY;
	anisoGetBasis( ss.basis, fs.anisoDirection, basisX, basisY );

	if( path.isNonSpecular )
	{ regularizeAnisoGGX( a ); }

	sampleBTDF_AnisoGGX( ss, a.x, a.y, fs.eta, basisX, basisY );
	ss.flagSpecular = isSpecularGGX( a.z );
	ss.specularity  = fs.glossTransmission * fs.transmission;
}

#elif defined(RT_TRANSMISSION_GLINTS)
#include "data/shader/scene/raytracing/bsdf/glints.comp"

void	TransmissionGlintsEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness  = saturate( 1.0 - fs.gloss );
	float alpha      = roughness * roughness;
	float glintAlpha = fs.glintUseMicrofacet ? alpha : float( fs.glintRoughness * fs.glintRoughness );

	// regularize both beckmann alpha and glint alpha
	if( path.isNonSpecular )
	{
		regularizeGGX( alpha );
		regularizeGGX( glintAlpha );
	}

	// calculate ray directions for tangent space
	const vec3 V_t = normalize( transformVecTo( ss.basis, ss.V ) );
	const vec3 L_t = normalize( transformVecTo( ss.basis, ss.L ) );
	const vec3 H_t = normalize( transformVecTo( ss.basis, ss.H ) );

	if( isTransmission( ss ) && ss.NdotV > 0.0 && (( dot(H_t, V_t) * dot(H_t, L_t) ) < 0) )
	{
		// compute BRDF and PDF if the two vectors are in the opposite hemisphere w.r.t microfacet normal
		float		pdf;
		const float btdf = evaluateGlintsBTDF( fs, V_t, L_t, H_t, fs.eta, alpha, glintAlpha, pdf );
		if( pdf > 0.0 && btdf > 0)
		{
			const vec3 Tout = ss.Tout * fs.transmissivity;
			ss.bsdf += Tout * btdf * abs( L_t.z );
			ss.pdf += pdf * ss.transmissionWeight;
		}
	}
}

void	TransmissionGlintsSample( in PathState path, inout FragmentState fs, inout SampleState ss )
{
	const float roughness = saturate( 1.0 - fs.gloss );
	float alpha      = roughness * roughness;
	float glintAlpha = fs.glintUseMicrofacet ? alpha : float( fs.glintRoughness * fs.glintRoughness );

	if( path.isNonSpecular )
	{
		regularizeGGX( alpha );
		regularizeGGX( glintAlpha );
	}

	// calculate ray directions for tangent space
	const vec3 V_t = normalize( transformVecTo( ss.basis, ss.V ) );

	// sample microfacet normal
	bool sampledGlint = false;
	vec3 H_t =  sampleBRDF_Glints_t( fs, V_t, ss.r, fs.rng, alpha, glintAlpha, sampledGlint );

	// write the result back out
	H_t = normalize( transformVecFrom( ss.basis, H_t ) );
	if( dot( H_t, ss.V ) > 0.0 && refractVec( ss.V, H_t, fs.eta, ss.L ) )
	{
		ss.H = H_t;
		ss.NdotL = dot( ss.basis.N, ss.L );
	}
	ss.flagSpecular = isSpecularGGX( sampledGlint ? glintAlpha : alpha );
	ss.specularity  = ( sampledGlint ? saturate( 1.0 - fs.glintRoughness ) : fs.gloss ) * fs.transmission;
}

#else //GGX
void	TransmissionGGXEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness	= saturate( 1.0 - fs.glossTransmission );
	float alpha		= roughness * roughness;
	
	if( path.isNonSpecular )
	{ regularizeGGX( alpha ); }

	evaluateBTDF_GGX( ss, fs.transmissivity, alpha, fs.eta );
}

void	TransmissionGGXSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = saturate( 1.0 - fs.glossTransmission );
	float alpha		= roughness * roughness;

	if( path.isNonSpecular )
	{ regularizeGGX( alpha ); }

	sampleBTDF_GGX( ss, alpha, fs.eta );
	ss.flagSpecular = isSpecularGGX( alpha );
	ss.specularity  = fs.glossTransmission * fs.transmission;
}
#endif

#if defined(REFLECTION)
	#if defined(RT_TRANSMISSION_ANISO)
		#define TransmissionEvaluate	TransmissionAnisoGGXEvaluate
		#define TransmissionSample		TransmissionAnisoGGXSample
	#elif defined(RT_TRANSMISSION_GLINTS)
		#define TransmissionEvaluate	TransmissionGlintsEvaluate
		#define TransmissionSample		TransmissionGlintsSample
	#else
		#define TransmissionEvaluate	TransmissionGGXEvaluate
		#define TransmissionSample		TransmissionGGXSample
	#endif
	#define TransmissionIsSpecular
#else
	#include "data/shader/mat/transmission/samplePassthrough.frag"
#endif
