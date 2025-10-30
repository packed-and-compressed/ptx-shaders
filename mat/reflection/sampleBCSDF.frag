#include "data/shader/common/rng.comp"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/mat/reflection/fresnelGGX.frag"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bcsdf/bcsdfChiang.comp"
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"

#ifdef SUBROUTINE_SECONDARY
#define EvaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf) evaluateBCSDFClearcoat(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf)
#define EvaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf) evaluateBCSDFCardsClearcoat(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf)
#define SampleBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r) sampleBCSDFClearcoat_t(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r)
#else
#define EvaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf) evaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf)
#define EvaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf) evaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf)
#define SampleBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r) sampleBCSDF_t(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r)
#endif

void ReflectionBCSDFPrecompute( in ReflectionBCSDFParams p, inout MaterialState m, in FragmentState s )
{  
    _p( m.hairRadialRoughness ) = 1.0 - scaleAndBias( textureMaterial( p.radialRoughnessMap, m.vertexTexCoord, 1.0 ), p.radialRoughnessScaleBias );

    const vec2 xrot = vec2( f16tof32( p.rotation ), f16tof32( p.rotation >> 16 ) );
    const vec2 yrot = vec2( -xrot.y, xrot.x );

    const vec4 directionSample = textureMaterial( p.directionMap, m.vertexTexCoord.uvCoord, vec4( 0.5, 0.0, 0.0, 0.0 ) );
    vec3 direction = directionSample.xyz;
    HINT_FLATTEN
    if( ( p.flags & DIRECTION_MAP_FLAG_SCALEBIAS ) )
    { direction = 2.0 * direction - 1.0; }

    if ( ( p.flags & DIRECTION_MAP_FLAG_SWAP_XY ) )
    { direction.xy = direction.x * yrot + direction.y * xrot; }
    else
    { direction.xy = direction.x * xrot + direction.y * yrot; }

    _p( m.hairDirection ) = direction;
    
    _p( m.hairType ) = p.type;
    _p( m.hairSin2kAlpha ) = p.sin2kAlpha;
    _p( m.hairCos2kAlpha ) = p.cos2kAlpha;
}

void ReflectionBCSDFPrecomputeMerge( in MaterialState m, inout FragmentState s )
{
    // TODO(Kai): Triplanar?
    float roughness;
    if( m.glossFromRoughness )
    { roughness = _p( m.glossOrRoughness ); }
    else
    { roughness = saturate( 1.0 - _p( m.glossOrRoughness ) ); }
    
    const float betaM = clamp( roughness, 0.01, 1.0 ); // BetaM: the longitudinal roughness of the hair, mapped to the range [0, 1]
    const float betaN = clamp( _p( m.hairRadialRoughness ), 0.01, 1.0 ); // BetaN: the radial roughness of the hair, mapped to the range [0, 1]
    const vec3 albedoSigmaA = sigmaAFromReflectance( m.hairAlbedo.rgb, betaN );
    const vec3 tintSigmaA = sigmaAFromReflectance( m.hairTint, betaN );
    
    HairState hairState;
    hairState.hairDirection = normalize( _p( m.hairDirection ) );
    hairState.hairSigmaA = albedoSigmaA + tintSigmaA;
    hairState.hairType = _p( m.hairType );
    hairState.hairBetaM = betaM;
    hairState.hairBetaN = betaN;
    hairState.hairV = longitudinalVariance( betaM );
    hairState.hairS = logisticScale( betaN );
    hairState.hairSin2kAlpha = _p( m.hairSin2kAlpha );
    hairState.hairCos2kAlpha = _p( m.hairCos2kAlpha );
    _p( s.hairState ) = hairState;
}

void ReflectionBCSDFEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
    // Initialize hair eval data
    const HairState hairState = _p(fs.hairState);
    const vec3 reflectivity = _p(fs.reflectivity);
    const vec3 Fintensity = _p(fs.fresnel);
#ifdef SUBROUTINE_SECONDARY
	const float eta = fs.frontFacing ? _p( fs.eta ) : rcpSafe( _p( fs.eta ) );
#else
	const float eta = _p( fs.eta );
#endif
    TangentBasis basis;
    float h = 2.0 * fs.vertexTexCoordSecondary.y - 1.0 ;
    if ( hairState.hairType == 0 ) /* Hair Strands */
    {
        basis = getHairBasis( fs.vertexTangent, ss.V );
    }
    else /* Hair Cards */
    {
        vec3 basisX, basisY;
        anisoGetBasis( fs, hairState.hairDirection, basisX, basisY );
        basis.T = basisX;
        basis.B = basisY;
        basis.N = ss.basis.N;
    }

    const float VdotL = dot( ss.V, ss.L );
    const vec3	V_t = normalize( transformVecTo( basis, ss.V ) );
	const vec3	L_t = normalize( transformVecTo( basis, ss.L ) );

	BCSDFAttenuation attenuation;
    float pdf;
    vec3 f;
    //REIVEW: this branch should ideally be decided at shader compile-time ~ms
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

    float bsdfWeight = fs.reflectionOcclusion;
	float pdfWeight  = _p(ss.reflectionWeight);

    if ( pdf > 0.0 )
    {
        ss.bsdf += ( ss.Tin * ss.Tout ) * f * abs( L_t.z ) * bsdfWeight;
	    ss.pdf  += pdf * pdfWeight;
    }
    vec3 T = vec3(1.0, 1.0, 1.0);
#ifdef SUBROUTINE_SECONDARY
    T *= (1.0 - attenuation.terms[0].xyz);
#else
    T *= (1.0 - attenuation.terms[0].xyz);
    T *= attenuation.terms[1].xyz;
    T *= attenuation.terms[2].xyz;
    T *= attenuation.terms[3].xyz;
#endif
    ss.Tin *= T;
    ss.Tout *= T;
}

void ReflectionBCSDFSample( PathState path, in FragmentState fs, inout SampleState ss )
{
    // Initialize hair eval data
    const HairState hairState = _p(fs.hairState);
    const vec3 reflectivity = _p(fs.reflectivity);
    const vec3 Fintensity = _p(fs.fresnel);
#ifdef SUBROUTINE_SECONDARY
	const float eta = fs.frontFacing ? _p( fs.eta ) : rcpSafe( _p( fs.eta ) );
#else
	const float eta = _p( fs.eta );
#endif
    TangentBasis basis;
    float h = 0.0;
    if ( hairState.hairType == 0 ) /* Hair Strands */
    {
        basis = getHairBasis( fs.vertexTangent, ss.V );
        h = 2.0 * fs.vertexTexCoordSecondary.y - 1.0 ;
    }
    else /* Hair Cards */
    {
        basis = createTangentBasis( ss.basis.N, hairState.hairDirection );
        // Since h is not available for hair cards, we will follow the original importance sampling strategy
        // which is to sample h from a uniform distribution.
        h = 2.0 * ss.r.z - 1.0;
    }

    const vec3  V_t = normalize( transformVecTo( basis, ss.V ) );
    const vec3  L_t = SampleBCSDF( eta, reflectivity, Fintensity, h, hairState.hairSigmaA, hairState.hairV, hairState.hairS, hairState.hairSin2kAlpha, hairState.hairCos2kAlpha, V_t, ss.r );

    ss.L = normalize( transformVecFrom( basis, L_t ) );
    ss.NdotL = dot( ss.basis.N, ss.L );
    
    HINT_FLATTEN
	if( isTransmission(ss) )
	{
		ss.H = -normalize( ss.L + fs.eta * ss.V );
		HINT_FLATTEN if( dot( ss.basis.N, ss.H ) < 0.0 )
		{ ss.H = -ss.H; }
	}
	else
	{
		ss.H = normalize( ss.L + ss.V );
	}

    ss.flagHairBCSDF = true;
}

#undef EvaluateBCSDF
#undef EvaluateBCSDFCards
#undef SampleBCSDF

// TODO(Kai) NOTE: The use of ReflectionGGXFresnel is incorrect here, since the fresnel term relies on the h value
// refer to hairAttenuation function in bcsdfChiang.comp for the correct implementation.

#ifdef SUBROUTINE_SECONDARY
#define ReflectionPrecomputeSecondary(p,m,s)    ReflectionBCSDFPrecomputeSecondary(p.reflectionSecondary,m,s)
#define ReflectionPrecomputeMergeSecondary      ReflectionBCSDFPrecomputeMergeSecondary
#define ReflectionEvaluateSecondary				ReflectionBCSDFEvaluateSecondary
#define ReflectionSampleSecondary				ReflectionBCSDFSampleSecondary
#define ReflectionFresnelSecondary				ReflectionGGXFresnelSecondary
#define ReflectionBCSDF
#else
#define ReflectionPrecompute(p,m,s)	            ReflectionBCSDFPrecompute(p.reflection,m,s)
#define ReflectionPrecomputeMerge               ReflectionBCSDFPrecomputeMerge
#define ReflectionEvaluate	                    ReflectionBCSDFEvaluate
#define ReflectionSample	                    ReflectionBCSDFSample
#define ReflectionFresnel			            ReflectionGGXFresnel
#define ReflectionBCSDF
#endif
