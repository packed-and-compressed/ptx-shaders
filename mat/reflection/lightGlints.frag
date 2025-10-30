#include "data/shader/common/tangentbasis.sh"
#include "data/shader/common/util.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/fresnel.frag"
#include "data/shader/scene/raytracing/bsdf/glints.comp"

#ifndef GLINTS_IMPORTANCE_SAMPLES
	#define GLINTS_IMPORTANCE_SAMPLES	2
#endif

#ifndef REFLECTION_CUBE_MAP
#define REFLECTION_CUBE_MAP
USE_TEXTURECUBE(tReflectionCubeMap);
#endif
uniform float   uReflectionBrightness;
uniform uint    uGlintsSeed;

// precompute glint's UV and its differentials for both direct light evaluation and BSDF sampling + evaluation
void	ReflectionGlintsPrecompute( in ReflectionGlintsParams p, inout MaterialState m, in FragmentState s )
{
    m.glintDensity = p.glintDensity;
    m.glintDistance = p.glintDistance;
    m.glintScale = p.glintScale;
    m.glintExtent = p.glintExtent;
}

void	ReflectionGlintsPrecomputeMerge( in MaterialState m, inout FragmentState s )
{
    RNG rng = rngInit( ( s.screenCoord.x << 16 ) | s.screenCoord.y, uGlintsSeed ^ asuint( s.screenDepth ) );
    const vec2 r = rngNextVec2( rng );
	// glint settings from glint params
    s.glintSettings = vec4( m.glintDensity, m.glintDistance, 1.0 / m.glintScale, m.glintExtent );
	// calculate texture coordinate for glints 
    s.glintUV = glintStochastic( s.glintSettings.w, r.x, s.vertexPosition, s.normal, s.glintWeight );
	// calculate UV differential
    diff2 dUV = interpolateGlintsDifferentials( s.glintSettings.w, r.x, s.vertexPosition, s.normal, s.glintUV );
	// clamp UV differential so that the major axis can only be a maximum of 8x larger than the minor axis
	// to prevent high iteration count when we iterate over the ray footprint
    clampRayFootprint( dUV );
	// precompute the data we need to iterate through multiple ellipses over the ray footprint
    precomputeGlintData( s.glintSettings, r.y, s.glintUV, dUV, s.glintPackedData, s.glintEWACoeff, s.glintLOD, s.glintS, s.glintT );
    s.glintIntensity *= s.glintWeight;
}

void	ReflectionGlintsEnv( inout FragmentState s )
{
	// calculate alpha term = roughness^2 for both the beckmann layer and the glints layer
	const float roughness  = saturate( 1.0 - s.gloss );
	const float alpha      = roughness * roughness;
	const float glintAlpha = s.glintUseMicrofacet ? alpha : float( s.glintRoughness * s.glintRoughness );
	RNG rng = rngInit( ( s.screenCoord.x << 16 ) | s.screenCoord.y, uGlintsSeed );

	// calclate tangent basis and convert vectors from world space into tangent space
	const TangentBasis basis = createTangentBasis( s.normal );
	const vec3 V_t = normalize( transformVecTo( basis, s.vertexEye ) );

	const float lodFactor = 0.5 / log( 2.0 );
	const float lodBase = log( float( 256 * 256 ) / GLINTS_IMPORTANCE_SAMPLES );
	const float r = rngNextFloat( rng );
	vec3 spec = vec3( 0.0, 0.0, 0.0 );
	for( int i = 0; i < GLINTS_IMPORTANCE_SAMPLES; i++ )
	{
		// sample microfacet normal
		bool sampledGlint = false;
		vec3 H_t = sampleBRDF_Glints_t( s, V_t, rngNextVec4( rng ), rng, alpha, glintAlpha, sampledGlint );

		// evaluate glints brdf and pdf
		const vec3 L_t = reflectVec( V_t, H_t );
		const float VdotH = dot( V_t, H_t );
		const float LdotH = dot( L_t, H_t );
		float		pdf;
		const float brdf = evaluateGlintsBRDF( s, V_t, L_t, H_t, alpha, glintAlpha, pdf );

		// convert vectors to world space vectors
		if( pdf > 0.0 && brdf > 0 && VdotH > 0 && LdotH > 0 )
		{
			const float distortion = ( 4.0 * pow( 1.2, 2.0 ) * pow( abs( L_t.z ) + 1.0, 2.0 ) );
			const float lod = max( 0.0, lodFactor * ( lodBase - log( pdf * distortion ) ) );
			const vec3 lightSample = textureCubeLod( tReflectionCubeMap, normalize( transformVecFrom( basis, L_t ) ), lod ).xyz;
			const vec3 F = fresnelSchlick( s.reflectivity, s.fresnel, VdotH );
			spec += lightSample * ( F * max( L_t.z, 0.0 ) * brdf * rcpSafe( pdf ) );
		}
	}
	s.specularLight = spec*( 1.0 / GLINTS_IMPORTANCE_SAMPLES ) * uReflectionBrightness;
}

void	ReflectionGlintsLight( inout FragmentState s, LightParams l )
{
	// calculate alpha term = roughness^2 for both the beckmann layer and the glints layer
	const float roughness  = saturate( 1.0 - s.gloss );
	const float alpha      = roughness * roughness;
	const float glintAlpha = s.glintUseMicrofacet ? alpha : float( s.glintRoughness * s.glintRoughness );
	
	// calclate tangent basis and convert vectors from world space into tangent space
	const TangentBasis basis = createTangentBasis( s.normal );
	const vec3 V_t = normalize( transformVecTo( basis, s.vertexEye ) );
	const vec3 L_t = normalize( transformVecTo( basis, l.direction ) );
	
	// calculate microfacet normal
	vec3 H_t = normalize( V_t + L_t );
	H_t = dot( V_t, H_t ) < 0 ? -H_t : H_t;

	const vec3 H = normalize( transformVecFrom( basis, H_t ) );
	
	// light params
	const float glintAlpha2 = max( glintAlpha * glintAlpha, MIN_GLINTS_ALPHASQR );
	adjustAreaLightSpecular( l, reflect( -s.vertexEye, s.normal ), rcp( 3.141593 * glintAlpha2 ) );
    float lightAttenuation = l.toSource.w > 0 ? ( l.invDistance * l.invDistance ) : 1.0;

	// evaluate glints
	float		pdf;
	const float brdf = evaluateGlintsBRDF( s, V_t, L_t, H_t, alpha, glintAlpha, pdf );
	
	// check if it is reflective and if brdf and pdf are fine
	const float VdotH = dot( V_t, H_t );
	const float LdotH = dot( L_t, H_t );
	if( pdf > 0.0 && brdf > 0 && VdotH > 0 && LdotH > 0 )
	{
		vec3	   spec = l.color * l.shadow.rgb * lightAttenuation * max( L_t.z, 0.0 );
		const vec3 F = fresnelSchlick( s.reflectivity, s.fresnel, max( dot( normalize( V_t + L_t ), V_t ), 0.0 ) );

		// final
		s.specularLight += ( F * brdf * spec );
	}
}

#define ReflectionPrecompute(p,m,s)	ReflectionGlintsPrecompute(p.reflection,m,s)
#define ReflectionPrecomputeMerge	ReflectionGlintsPrecomputeMerge
#define ReflectionEnv				ReflectionGlintsEnv
#define Reflection					ReflectionGlintsLight