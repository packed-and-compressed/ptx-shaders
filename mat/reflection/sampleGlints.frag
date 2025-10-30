#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/raydifferential.sh"
#include "data/shader/scene/raytracing/bsdf/glints.comp"
#include "data/shader/scene/raytracing/bsdf/microfacet.comp"
#include "data/shader/scene/raytracing/bsdf/regularize.comp"

USE_TEXTURE3D( tFresnelBeckmann );

void	ReflectionGlintsPrecompute( in ReflectionGlintsParams p, inout MaterialState m, in FragmentState s )
{
    m.glintDensity = p.glintDensity;
    m.glintDistance = p.glintDistance;
    m.glintScale = p.glintScale;
    m.glintExtent = p.glintExtent;
}

void	ReflectionGlintsPrecomputeMerge( in MaterialState m, inout FragmentState s )
{
    const vec2 r = rngNextVec2( s.rng );
	// glint settings from glint params (we skip glintUseMicrofacet here in RT shading v2 as we are dealing with it in glintMap.frag)
    s.glintSettings = vec4( m.glintDensity, m.glintDistance, 1.0 / m.glintScale, m.glintExtent );
	// calculate texture coordinate for glints and calculate its differential
    s.glintUV = glintStochastic( s.glintSettings.w, r.x, s.vertexPosition, s.normal, s.glintWeight );
	// calculate UV differential
    diff2 dUV;
    RayDifferential rd = getRayDifferentialPrecise( s );
    dUV = interpolateGlintsDifferentials( s.glintSettings.w, r.x, rd.dP, s.dN, s.vertexPosition, s.normal, s.glintUV );
	// clamp UV differential so that the major axis can only be a maximum of 8x larger than the minor axis
	// to prevent high iteration count when we iterate over the ray footprint
    clampRayFootprint( dUV );
	// precompute the data we need to iterate through multiple ellipses over the ray footprint
    precomputeGlintData( s.glintSettings, r.y, s.glintUV, dUV, s.glintPackedData, s.glintEWACoeff, s.glintLOD, s.glintS, s.glintT );
    s.glintIntensity *= s.glintWeight;
}

void	ReflectionGlintsEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	const float roughness  = saturate( 1.0 - fs.gloss );
	float		alpha      = roughness * roughness;
	float		glintAlpha = fs.glintUseMicrofacet ? alpha : float( fs.glintRoughness * fs.glintRoughness );
	const float bsdfWeight = fs.reflectionOcclusion;

	// regularize both beckmann alpha and glint alpha
	if( path.isNonSpecular )
	{
		regularizeGGX( alpha );
		regularizeGGX( glintAlpha );
	}

	// calculate ray directions for tangent space
	const vec3	V_t = normalize( transformVecTo( ss.basis, ss.V ) );
	const vec3	L_t = normalize( transformVecTo( ss.basis, ss.L ) );
	const vec3	H_t = normalize( transformVecTo( ss.basis, ss.H ) );

	// get glint map
	const float VdotH = dot( V_t, H_t );
	const float LdotH = dot( L_t, H_t );
	
	if( isReflection( ss ) && ss.NdotV > 0 && ( VdotH * LdotH ) > 0 )
	{
		// evaluate glints brdf and pdf
		float pdf;
		const float brdf = evaluateGlintsBRDF( fs, V_t, L_t, H_t, alpha, glintAlpha, pdf );
		if( pdf > 0.0 && brdf > 0.0 )
		{
			const vec3 Fout = fresnelSchlick( fs.reflectivity, fs.fresnel, VdotH, fs.eta );
			ss.bsdf += ( ss.Tin * ss.Tout ) * ( Fout * brdf ) * abs( ss.NdotL ) * bsdfWeight;
			ss.pdf  += pdf * ss.reflectionWeight;
			ss.Tin  *= oneminus( fresnelSchlick( fs.reflectivity, fs.fresnel, LdotH ) );
		}
	}

	ss.Tout *= oneminus( fresnelSchlick( fs.reflectivity, fs.fresnel, VdotH, fs.eta ) );
}

void	ReflectionGlintsSample( in PathState path, inout FragmentState fs, inout SampleState ss )
{
	const float roughness  = saturate( 1.0 - fs.gloss );
	float		alpha      = roughness * roughness;
	float		glintAlpha = fs.glintUseMicrofacet ? alpha : float( fs.glintRoughness * fs.glintRoughness );
	
	if( path.isNonSpecular )
	{
		regularizeGGX( alpha );
		regularizeGGX( glintAlpha );
	}
	
	// calculate ray directions for tangent space
	const vec3	V_t = normalize( transformVecTo( ss.basis, ss.V ) );

	// sample microfacet normal
	bool sampledGlint = false;
	const vec3 H_t =  sampleBRDF_Glints_t( fs, V_t, ss.r, fs.rng, alpha, glintAlpha, sampledGlint );
	
	// write the result back out
	ss.H			= normalize( transformVecFrom( ss.basis, H_t ) );
	ss.L			= reflectVec( ss.V, ss.H );
	ss.NdotL		= dot( ss.basis.N, ss.L );
	ss.flagSpecular = isSpecularGGX( sampledGlint ? glintAlpha : alpha );
	ss.specularity  = ( sampledGlint ? saturate( 1.0 - fs.glintRoughness ) : fs.gloss ) * fs.metalness;
}

vec3	ReflectionGlintsFresnel( in FragmentState fs, float NdotV )
{
	// calculate the uv of the 3d texture and read the weighting for coating
	float F = texture3D( tFresnelBeckmann, fresnelPreconvUVW( fs.frontFacing, fs.gloss, NdotV, fs.eta ) ).x;
	return mix( fs.reflectivity, vec3(1.0, 1.0, 1.0), F * fs.fresnel );
}

#define ReflectionPrecompute(p,m,s)		ReflectionGlintsPrecompute(p.reflection,m,s)
#define ReflectionPrecomputeMerge		ReflectionGlintsPrecomputeMerge
#define ReflectionEvaluate				ReflectionGlintsEvaluate
#define ReflectionSample				ReflectionGlintsSample
#define ReflectionFresnel				ReflectionGlintsFresnel
