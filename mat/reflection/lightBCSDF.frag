#include "data/shader/common/tangentbasis.sh"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/common/rng.comp"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/reflection/fresnelGGX.frag"
#include "data/shader/scene/raytracing/bcsdf/bcsdfChiang.comp"
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"

#ifndef BCSDF_IMPORTANCE_SAMPLES
	#define BCSDF_IMPORTANCE_SAMPLES	(8)
#endif

#ifdef SUBROUTINE_SECONDARY
#define EvaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf) evaluateBCSDFClearcoat(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf)
#define EvaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf) evaluateBCSDFCardsClearcoat(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf)
#define SampleBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r) sampleBCSDFClearcoat_t(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r)
#else
#define EvaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf) evaluateBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, attenuation, pdf)
#define EvaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf) evaluateBCSDFCards(eta, reflectivity, Fintensity, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, L_t, VoL, beta_n, attenuation, pdf)
#define SampleBCSDF(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r) sampleBCSDF_t(eta, reflectivity, Fintensity, h, sigma_a, v, s, sin2kAlpha, cos2kAlpha, V_t, r)
#endif

#ifndef BCSDF_REFLECTION_CUBE_MAP
#define BCSDF_REFLECTION_CUBE_MAP
USE_TEXTURECUBE(tBCSDFReflectionCubeMap);
#endif

uniform float   _p(uBCSDF_ReflectionBrightness);
uniform uint    _p(uBCSDF_Seed);

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

void	ReflectionBCSDFEnv( inout FragmentState s )
{
    RNG rng = rngInit( ( s.screenCoord.x << 16 ) | s.screenCoord.y, _p(uBCSDF_Seed) );

    const HairState hairState = _p(s.hairState);
    const vec3 reflectivity = _p(s.reflectivity);
    const vec3 Fintensity = _p(s.fresnel);
    const float eta = _p(s.eta);
    TangentBasis basis;
    float h;
    if ( hairState.hairType == 0 ) /* Hair Strands */
    {
        basis = getHairBasis( s.vertexTangent, s.vertexEye );
        h = 2.0 * s.vertexTexCoordSecondary.y - 1.0;
    }
    else /* Hair Cards */
    {
        vec3 basisX, basisY;
        anisoGetBasis( s, hairState.hairDirection, basisX, basisY );
        basis.T = basisX;
        basis.B = basisY;
        basis.N = s.normal;
        // Since h is not available for hair cards, we will follow the original importance sampling strategy
        // which is to sample h from a uniform distribution.
        h = 2.0 * rngNextFloat( rng ) - 1.0;
    }

    const vec3 V_t = normalize( transformVecTo( basis, s.vertexEye ) );

    const float lodBase = 0.5 * log2( ( 256.0 * 256.0 ) / float( BCSDF_IMPORTANCE_SAMPLES ) );
	vec3 fsum = vec3( 0.0, 0.0, 0.0 );
	HINT_UNROLL
	for( int i = 0; i < BCSDF_IMPORTANCE_SAMPLES; i++ )
	{
        // Get 4 uniform random numbers
        const vec4 r = rngNextVec4( rng );
        // Sample the BCSDF
        const vec3 L_t = SampleBCSDF( eta, reflectivity, Fintensity, h, hairState.hairSigmaA, hairState.hairV, hairState.hairS, hairState.hairSin2kAlpha, hairState.hairCos2kAlpha, V_t, r );
        const vec3 L = transformVecFrom( basis, L_t );
        const float VdotL = dot( s.vertexEye, L );

        // Evaluate the BCSDF given V_t and L_t
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

            // Sample the environment map
            const float lod = lodBase - 0.5*log2( pdf );
            const vec3 radiance = textureCubeLod( tBCSDFReflectionCubeMap, L, lod ).xyz;

            // Compute the contribution due to the sampled direction
            fsum += radiance * T * f * abs( L_t.z ) / pdf;
        }
	}

	// Add our contribution
	s.specularLight += fsum * ( 1.0 / float( BCSDF_IMPORTANCE_SAMPLES ) ) * _p(uBCSDF_ReflectionBrightness);
}

void	ReflectionBCSDFLight( inout FragmentState s, LightParams l )
{
    RNG rng = rngInit( ( s.screenCoord.x << 16 ) | s.screenCoord.y, _p(uBCSDF_Seed) );

    const HairState hairState = _p(s.hairState);
    const vec3 reflectivity = _p(s.reflectivity);
    const vec3 Fintensity = _p(s.fresnel);
    const float eta = _p(s.eta);
    TangentBasis basis;
    float h;
    if ( hairState.hairType == 0 ) /* Hair Strands */
    {
        basis = getHairBasis( s.vertexTangent, s.vertexEye );
        h = 2.0 * s.vertexTexCoordSecondary.y - 1.0;
    }
    else /* Hair Cards */
    {
        basis = createTangentBasis( s.normal, hairState.hairDirection );
        // Since h is not available for hair cards, we will follow the original importance sampling strategy
        // which is to sample h from a uniform distribution.
        h = 2.0 * rngNextFloat( rng ) - 1.0;
    }

	// Light params
	adjustAreaLightSpecular( l, reflect( -s.vertexEye, s.normal ), rcp( 3.141593 * hairState.hairBetaM * hairState.hairBetaM ) );
    float lightAttenuation = l.toSource.w > 0 ? ( l.invDistance * l.invDistance ) : 1.0;

    const vec3 V = s.vertexEye;
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
        s.specularLight += ( T * f * spec );
    }
}

#undef EvaluateBCSDF
#undef EvaluateBCSDFCards
#undef SampleBCSDF

#ifdef SUBROUTINE_SECONDARY
#define ReflectionPrecomputeSecondary(p,m,s)	ReflectionBCSDFPrecomputeSecondary(p.reflectionSecondary,m,s)
#define ReflectionPrecomputeMergeSecondary      ReflectionBCSDFPrecomputeMergeSecondary
#define ReflectionEnvSecondary		    	    ReflectionBCSDFEnvSecondary
#define ReflectionSecondary             	    ReflectionBCSDFLightSecondary
#define ReflectionFresnelSecondary				ReflectionGGXFresnelSecondary
#else
#define ReflectionPrecompute(p,m,s)             ReflectionBCSDFPrecompute(p.reflection,m,s)
#define ReflectionPrecomputeMerge       	    ReflectionBCSDFPrecomputeMerge
#define ReflectionEnv                           ReflectionBCSDFEnv
#define Reflection                              ReflectionBCSDFLight
#define ReflectionFresnel			            ReflectionGGXFresnel
#endif
