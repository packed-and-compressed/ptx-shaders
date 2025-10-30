#include "data/shader/common/util.sh"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/fresnel.frag"
#include "data/shader/mat/microfacetDistribution.frag"
#include "ltcGGX.frag"
#include "fresnelGGX.frag"

#ifndef GGX_IMPORTANCE_SAMPLES
	#define GGX_IMPORTANCE_SAMPLES	24
#endif

#ifndef REFLECTION_CUBE_MAP
#define REFLECTION_CUBE_MAP
USE_TEXTURECUBE(tReflectionCubeMap);
#endif

uniform float	_p(uReflectionBrightness);
uniform float	_p(uGGXDither);
uniform vec3	_p(uGGXRands)[GGX_IMPORTANCE_SAMPLES]; //{ sqrt( r1 ), cos( 2*pi*r2 ), sin( 2*pi*r2 ) }

#ifndef GGX_SAMPLE_VNDF
#define GGX_SAMPLE_VNDF
// Implementation of VNDF sampling according to the following paper.
// "Sampling the GGX Distribution of Visible Normals", 2018, Eric Heitz
// https://jcgt.org/published/0007/04/01/paper.pdf
// Handles back facing normals correctly
vec3	sampleVNDF_GGX_t( vec3 r, vec3 V_t, float ax, float ay )
{
	// stretch by microfacet roughness
    vec3 V_h = normalize( vec3( ax * V_t.x, ay * V_t.y, V_t.z ) );

	// Build an orthonormal basis
	float lengthSquared = V_h.x * V_h.x + V_h.y * V_h.y;
	vec3 T1 = ( lengthSquared > 0 ) ? vec3( -V_h.y, V_h.x, 0 ) * rsqrt( lengthSquared ) : vec3( 1, 0, 0 );
	vec3 T2 = cross( V_h, T1 );

	// Sample point with polar coords
	float p1 = r.x * r.y;
	float p2 = r.x * r.z;
	float s = 0.5 * ( 1.0 + V_h.z );

	p2 = mix( sqrt( 1.0 - p1 * p1 ), p2, s );

	// compute normal
	vec3 N_h = p1 * T1 + p2 * T2 + sqrt( max( 0.0, 1.0 - p1*p1 - p2*p2 ) ) * V_h;

	// unstrech
	return normalize( vec3( ax * N_h.x, ay * N_h.y, max( 0.0, N_h.z ) ) );
}
#endif

void	ReflectionGGXEnv( inout FragmentState s )
{
	float gloss = _p(s.gloss);
	float roughness = saturate( 1.0 - gloss );
	float alpha  = roughness * roughness;
	float alpha2 = max( alpha * alpha, GGX_MIN_ALPHASQR );
	float lodBase = 0.5 * log2( (256.0*256.0)/float(GGX_IMPORTANCE_SAMPLES) );

	vec4 sampleRotate;
	{
		uint seed = ((s.screenCoord.x & 0xFFFF) | (s.screenCoord.y << 16));
		uint r = seed * 747796405 + 2891336453;
		r = ((r >> ((r >> 28) + 4)) ^ r) * 277803737;
		r = (r >> 22) ^ r;
		float rnd = float(r & 0xFFFF) * (1.0/float(0xFFFF));

		float sampleTheta = (2.0 * 3.141593) * rnd * _p(uGGXDither);
		float sinTheta = sin(sampleTheta), cosTheta = cos(sampleTheta);
		sampleRotate = vec4( cosTheta, sinTheta, -sinTheta, cosTheta );
	}

	TangentBasis basis = createTangentBasis( s.normal );

	vec3  V_t   = transformVecTo( basis, s.vertexEye );
	float NdotV = V_t.z;
	float G1    = G1Smith_GGX( NdotV, alpha2 );

	vec3 spec = vec3(0.0, 0.0, 0.0);
	HINT_UNROLL
	for( int i=0; i<GGX_IMPORTANCE_SAMPLES; i++ )
	{
		vec3 H_t;
		{
			vec3 r = _p(uGGXRands)[i];
			r.yz   = r.y * sampleRotate.xy + r.z * sampleRotate.zw;
			H_t = sampleVNDF_GGX_t( r, V_t, alpha, alpha );
		}

		vec3 H = transformVecFrom( basis, H_t );
		vec3 L = reflectVec( s.vertexEye, H );

		float NdotH = dot(s.normal, H);
		float NdotL = dot(s.normal, L);
		float VdotH = dot(s.vertexEye, H);
		float LdotH = dot(L, H);
		
		float D     = NDF_GGX( NdotH, alpha2 );
		float G2    = 0.5 * G2Smith_GGX( NdotL, NdotV, alpha2 );
		float pdf   = G1 * D * ( 0.25 * rcp( abs(NdotV) ) );
			
		float lod = lodBase - 0.5*log2( pdf );
		vec3  radiance = textureCubeLod( tReflectionCubeMap, L, lod ).xyz;

		if( G2 > 0.0 && pdf > 0.0 )
		{
			//fresnel throughput to ensure energy conservation with clearcoat layer
			vec3 T  = vec3( 1.0, 1.0, 1.0 );
			#if defined(REFLECTION_SECONDARY) && !defined(SUBROUTINE_SECONDARY)
				 T  = oneminus( fresnelSchlick( s.reflectivitySecondary, s.fresnelSecondary, VdotH ) );
				 T *= oneminus( fresnelSchlick( s.reflectivitySecondary, s.fresnelSecondary, LdotH ) );
			#endif

			vec3 Fout = fresnelSchlick( _p(s.reflectivity), _p(s.fresnel), VdotH );
			vec3 brdf = ( Fout * D * G2 ) * saturate( NdotL );
			spec     += T * radiance * ( brdf / pdf );
		}
	}

	//add our contribution
	s.specularLight += spec * (1.0/float(GGX_IMPORTANCE_SAMPLES)) * _p(uReflectionBrightness);
}

void	ReflectionGGXLight( inout FragmentState s, LightParams l )
{
	//roughness
	const float roughness = saturate( 1.0 - _p(s.gloss) );
	const float NdotV = dot(s.vertexEye,s.normal);
	const TangentBasis tbn = createTangentBasisDir( s.normal, s.vertexEye );
	const LtcSample ltcSample = SampleGGXLTC(roughness, NdotV);

	float ltc = ltcEvaluate( ltcSample, tbn, l );
	// BRDF normalization and Fresnel, see "LTC Fresnel Approximation" by Stephen Hill (Eq. 5)
	vec3 F = mix( ltcSample.fresnel, ltcSample.magnitude, s.reflectivity );
	vec3 brdf = F * ltc;

	//fresnel throughput to ensure energy conservation with clearcoat layer
	//TODO: should we use LTC Fresnel approximation for clearcoat throughput as well? ~ms
	vec3 T  = vec3( 1.0, 1.0, 1.0 );
	#if defined(REFLECTION_SECONDARY) && !defined(SUBROUTINE_SECONDARY)
		vec3 H = normalize(l.direction + s.vertexEye);
		float VdotH = dot(s.vertexEye,H);
		float LdotH = dot(l.direction,H);
		T  = oneminus( fresnelSchlick( s.reflectivitySecondary, s.fresnelSecondary, VdotH ) );
		T *= oneminus( fresnelSchlick( s.reflectivitySecondary, s.fresnelSecondary, LdotH ) );
	#endif

	s.specularLight += T * l.color * l.shadow.rgb * l.attenuation * brdf;
}

#ifdef SUBROUTINE_SECONDARY
	#define ReflectionEnvSecondary		ReflectionGGXEnvSecondary
	#define ReflectionSecondary			ReflectionGGXLightSecondary
	#define ReflectionFresnelSecondary	ReflectionGGXFresnelSecondary
#else
	#define ReflectionEnv				ReflectionGGXEnv
	#define Reflection					ReflectionGGXLight
	#define ReflectionFresnel			ReflectionGGXFresnel
#endif
