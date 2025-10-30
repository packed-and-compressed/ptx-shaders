#include "data/shader/common/util.sh"
#include "data/shader/common/rng.comp"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/fresnel.frag"
#include "data/shader/mat/microfacetDistribution.frag"
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"
#include "data/shader/mat/reflection/ltcAnisotropic.frag"
#include "data/shader/mat/reflection/fresnelGGX.frag"

#ifndef ANISO_IMPORTANCE_SAMPLES
	#define ANISO_IMPORTANCE_SAMPLES 32
#endif

uniform vec3	_p(uAnisoRands)[ANISO_IMPORTANCE_SAMPLES];
uniform vec2	_p(uAnisoDither);

#ifndef REFLECTION_CUBE_MAP
#define REFLECTION_CUBE_MAP
USE_TEXTURECUBE(tReflectionCubeMap);
#endif
uniform float _p(uReflectionBrightness);

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

void    ReflectionAnisotropicPrecompute( in ReflectionAnisoGGXParams p, inout MaterialState m, in FragmentState s )
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

void	ReflectionAnisotropicPrecomputeMerge( in MaterialState m, inout FragmentState s )
{
    _p(s.anisoDirection) = _p(m.anisoDirection);
	_p(s.anisoAspect) = _p(m.anisoAspect);
}

void    ReflectionAnisotropicEnv( inout FragmentState s )
{
	float roughness = saturate( 1.0 - _p(s.gloss) );
    vec3 a = anisoRoughnessToA( roughness, _p(s.anisoAspect) );

	float alpha2 = max( a.z*a.z, GGX_MIN_ALPHASQR );
	float lodBase = 0.5*log2( (256.0*256.0)/float(ANISO_IMPORTANCE_SAMPLES) ) + min(a.x,a.y);

	vec3 basisX, basisY;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	anisoGetBasis( s, s.vertexTexCoord.projectorToShadingRotation, _p(s.anisoDirection), basisX, basisY );
#else
	anisoGetBasis( s, _p(s.anisoDirection), basisX, basisY );
#endif

	//a bit of per-pixel rotation to trade some artifacts for noise
	vec4 sampleRotate;
	vec2 anisoDither = _p(uAnisoDither);
	{
		uint seed = ((s.screenCoord.x & 0xFFFF) | (s.screenCoord.y << 16));
		uint r = seed * 747796405 + 2891336453;
		r = ((r >> ((r >> 28) + 4)) ^ r) * 277803737;
		r = (r >> 22) ^ r;
		float rnd = float(r & 0xFFFF) * (1.0/float(0xFFFF));

		float sampleTheta = (2.0 * 3.141593) * rnd * anisoDither.x;
		float sinTheta = sin(sampleTheta), cosTheta = cos(sampleTheta);
		sampleRotate = vec4( cosTheta, sinTheta, -sinTheta, cosTheta );
	}

	TangentBasis basis;
	basis.T = basisX;
	basis.B = basisY;
	basis.N = s.normal;

	vec3  V_t   = transformVecTo( basis, s.vertexEye );
	float NdotV = V_t.z;
	float G1    = G1Smith_GGX( NdotV, alpha2 );

	vec3 spec = vec3(0.0, 0.0, 0.0);
	HINT_UNROLL
	for( int i=0; i<ANISO_IMPORTANCE_SAMPLES; ++i )
	{
		//evaluate pdf for importance sampling
		vec3 H_t;
		{
			vec3 r = _p(uAnisoRands)[i];
			r.x    = sqrt( r.x + anisoDither.y );
			r.yz   = r.y * sampleRotate.xy + r.z * sampleRotate.zw;
			H_t = sampleVNDF_GGX_t( r, V_t, a.x, a.y );
		}

		vec3 H = transformVecFrom( basis, H_t );
		vec3 L = reflectVec( s.vertexEye, H );
		
		float NdotH = dot(s.normal, H);
		float NdotL = saturate(dot(s.normal,L));
		float VdotH = dot(s.vertexEye,H);
		float LdotH = dot(L,H);

		float D;
		{
			float ax_eval = max( a.x, GGX_MIN_ALPHAXY );
			float ay_eval = max( a.y, GGX_MIN_ALPHAXY );
			float xfactor = dot( basisX, H ) / ax_eval;
			float yfactor = dot( basisY, H ) / ay_eval;
			float d = xfactor*xfactor + yfactor*yfactor + NdotH*NdotH;
			D = rcp( PI * ax_eval * ay_eval * d * d );
		}
		float G2  = 0.5 * G2Smith_GGX( NdotL, NdotV, alpha2 );
		float pdf = G1 * D * (0.25 * rcp( abs( NdotV ) ));
			
		float lod = lodBase - 0.5*log2( pdf ) - 3.0;
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
	s.specularLight += spec * (1.0/float(ANISO_IMPORTANCE_SAMPLES)) * _p(uReflectionBrightness);
}

void    ReflectionAnisotropicLight( inout FragmentState s, LightParams l )
{
	//roughness
	float roughness = max(1.0 - _p(s.gloss), 0.027);
    vec3 a = anisoRoughnessToA( roughness, _p(s.anisoAspect) );

	//get tangent surface parameters
	vec3 tangent, bitangent;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	anisoGetBasis( s, s.vertexTexCoord.projectorToShadingRotation, _p(s.anisoDirection), tangent, bitangent );
#else
	anisoGetBasis( s, _p(s.anisoDirection), tangent, bitangent );
#endif
	
	TangentBasis tbn;
	tbn.T = tangent;
	tbn.B = bitangent;
	tbn.N = s.normal;
	const LtcSample ltcSample = SampleAnisotropicLTC(s.vertexEye, tbn, a.xy, l.rect);
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
	#define ReflectionPrecomputeSecondary(p,m,s)	ReflectionAnisotropicPrecomputeSecondary(p.reflectionSecondary,m,s)
	#define ReflectionPrecomputeMergeSecondary      ReflectionAnisotropicPrecomputeMergeSecondary
	#define ReflectionEnvSecondary		    		ReflectionAnisotropicEnvSecondary
    #define ReflectionSecondary             		ReflectionAnisotropicLightSecondary
	#define ReflectionFresnelSecondary				ReflectionGGXFresnelSecondary
#else
	#define ReflectionPrecompute(p,m,s)        		ReflectionAnisotropicPrecompute(p.reflection,m,s)
	#define ReflectionPrecomputeMerge       		ReflectionAnisotropicPrecomputeMerge
	#define ReflectionEnv       		    		ReflectionAnisotropicEnv
    #define Reflection                     			ReflectionAnisotropicLight
	#define ReflectionFresnel						ReflectionGGXFresnel
#endif
