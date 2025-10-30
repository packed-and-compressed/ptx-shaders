#include "data/shader/common/packed.sh"
#include "data/shader/mat/hybridConstants.comp"
#include "data/shader/mat/reflection/sampleBCSDF.frag"
#include "data/shader/mat/other/lightParams.frag"

uniform uint    _p(uBCSDF_Seed);

#ifdef SUBROUTINE_SECONDARY
#define EvaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf) evaluateBCSDFClearcoat(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf)
#define EvaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf) evaluateBCSDFCardsClearcoat(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf)
#define SampleBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r) sampleBCSDFClearcoat_t(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r)
#else
#define EvaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf) evaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf)
#define EvaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf) evaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf)
#define SampleBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r) sampleBCSDF_t(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r)
#endif

void	ReflectionBCSDFLightApprox(in PathState path, inout FragmentState fs, LightParams l )
{
	RNG rng = rngInit( ( fs.screenCoord.x << 16 ) | fs.screenCoord.y, _p(uBCSDF_Seed) );

    const HairState hairState = _p(fs.hairState);
    const vec3 reflectivity = _p(fs.reflectivity);
    const vec3 Fintensity = _p(fs.fresnel);
    const float eta = _p(fs.eta);
    TangentBasis basis;
    float h;
    if ( hairState.hairType == 0 ) /* Hair Strands */
    {
        basis = getHairBasis( fs.vertexTangent, fs.vertexEye );
        h = 2.0 * fs.vertexTexCoordSecondary.y - 1.0;
    }
    else /* Hair Cards */
    {
        basis = createTangentBasis( fs.normal, hairState.hairDirection );
        // Since h is not available for hair cards, we will follow the original importance sampling strategy
        // which is to sample h from a uniform distribution.
        h = 2.0 * rngNextFloat( rng ) - 1.0;
    }

	// Light params
	adjustAreaLightSpecular( l, reflect( -fs.vertexEye, fs.normal ), rcp( 3.141593 * hairState.hairBetaM * hairState.hairBetaM ) );
    float lightAttenuation = l.toSource.w > 0 ? ( l.invDistance * l.invDistance ) : 1.0;

    const vec3 V = fs.vertexEye;
    const vec3 L = l.direction;
	const vec3 V_t = normalize( transformVecTo( basis, V ) );
	const vec3 L_t = normalize( transformVecTo( basis, L ) );
    const float VdotL = dot( V, L );

	BCSDFAttenuation attenuation;
    float pdf;
    vec3 f;
    if ( hairState.hairType == 0 ) /* Hair Strands */
    {
		f = EvaluateBCSDF(
			eta,
            reflectivity,
            Fintensity,
			h,
			hairState.hairSigmaA,
			hairState.hairV,
			hairState.hairS,
			hairState.hairSin2kAlpha,
			hairState.hairCos2kAlpha,
			V_t,
			L_t,
			attenuation,
			pdf );
    }
    else /* Hair Cards */
    {
        f = EvaluateBCSDFCards(
			eta,
            reflectivity,
            Fintensity,
			hairState.hairSigmaA,
			hairState.hairV,
			hairState.hairS,
			hairState.hairSin2kAlpha,
			hairState.hairCos2kAlpha,
			V_t,
			L_t,
			VdotL,
			hairState.hairBetaN,
			attenuation,
			pdf );
    }
    if ( pdf > 0.0 )
    {
        vec3 T  = vec3( 1.0, 1.0, 1.0 );
	    #if defined(REFLECTION_SECONDARY) && !defined(SUBROUTINE_SECONDARY)
    		T *= (1.0 - attenuation.terms[0].xyz);
	    #endif

        const vec3	spec = l.color * lightAttenuation * l.shadow.rgb * abs( L_t.z );
        fs.specularLight += ( T * f * spec );
    }
}

uint2 ReflectionBCSDFSample( in PathState path, in FragmentState fs, inout SampleState ss, inout uint specularLobe )
{
	ReflectionBCSDFSample( path, fs, ss );
	specularLobe |= HYBRID_HAIR_FLAG;
#if defined( ReflectionSampleSecondary )
	fs.sampledGloss = 0.5f * ( fs.hairStateSecondary.hairBetaM + fs.hairStateSecondary.hairBetaM );
#else
	fs.sampledGloss = 0.5f * ( fs.hairState.hairBetaN + fs.hairState.hairBetaM ) ;
#endif
	// variance, -
	const uint packedVariance = packUnitFloat( 0.05f );
	return uint2( packedVariance << 16, 0 );
}

#undef EvaluateBCSDF
#undef EvaluateBCSDFCards
#undef SampleBCSDF

#ifdef SUBROUTINE_SECONDARY
    #define ReflectionBCSDF
	#define ReflectionLightApproxSecondary	ReflectionBCSDFLightApproxSecondary
#else
    #define ReflectionBCSDF
	#define ReflectionLightApprox			ReflectionBCSDFLightApprox
#endif
