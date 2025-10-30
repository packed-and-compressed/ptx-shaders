#include "data/shader/common/const.sh"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/other/shadowParams.frag"
#include "ltcMicrofiber.frag"
#include "ltcLambertian.frag"

//combined diffuse+microfiber BRDF
//based on "Production Friendly Microfacet Sheen BRDF", Alejandro Conty Estevez, Christopher Kulla

#ifndef SHEEN_IMPORTANCE_SAMPLES
#define SHEEN_IMPORTANCE_SAMPLES 32
#endif

uniform vec4	uDiffuseLightSphere[9];

USE_TEXTURECUBE(tSheenReflectionCubeMap);
uniform float	uSheenReflectionBrightness;
uniform float	uSheenDither;
uniform vec4	uSheenRands[SHEEN_IMPORTANCE_SAMPLES];

USE_TEXTURE2D(tMicrofiberSheenAlbedoLUT);

struct MicrofiberGCurve
{
	float a, b, c, d, e;
};

MicrofiberGCurve G_MicrofiberInterpolate( float roughness )
{
	float r  = 1.0 - roughness;
	float r2 = r * r;

	MicrofiberGCurve g;
	g.a = mix(  21.5473,  25.3245, r2 );
	g.b = mix(  3.82987,  3.32435, r2 );
	g.c = mix(  0.19823,  0.16801, r2 );
	g.d = mix( -1.97760, -1.27393, r2 );
	g.e = mix( -4.32054, -4.85967, r2 );
	return g;
}

float G_MicrofiberL( MicrofiberGCurve g, float x )
{
	return g.a * rcp(1.0 + g.b*pow(x, g.c)) + g.d*x + g.e;
}

float G1_Microfiber( MicrofiberGCurve g, float cosTheta )
{
	return cosTheta < 0.5
		? exp( G_MicrofiberL(g, cosTheta) )
		: exp( 2.0*G_MicrofiberL(g, 0.5) - G_MicrofiberL(g, saturate(1.0 - cosTheta)) );
}

float G2_Microfiber( float NdotL, float NdotV, float roughness )
{
	MicrofiberGCurve g = G_MicrofiberInterpolate( roughness );
	float dL = G1_Microfiber( g, NdotL );
	float dV = G1_Microfiber( g, NdotV );
	
	//soften shadow terminator, see section 4
	{
		float f = saturate( 1.0 - NdotL );
		f *= f; f *= f; f *= f; // f^8
		dL = pow( dL, 1.0 + 2.0*f );
	}
	return rcp( 1.0 + dL + dV );
}

float NDF_Microfiber( float NdotH, float roughness )
{
	float invr = rcp( roughness );
	float sinTheta2 = saturate( 1.0 - NdotH*NdotH );
	return ( 2.0 + invr ) * pow( sinTheta2, invr * 0.5 ) * INVTWOPI;
}

void	DiffusionMicrofiberEnv( inout FragmentState s )
{
	//sheen directional albedo for energy conservation
	float specAlbedoL = 0.0;
	float specAlbedoV = 0.0;

	//specular component
	{
		float roughness = max( s.sheenRoughness, 0.07 ); //I have a license to sheen!
		TangentBasis basis = createTangentBasis( s.normal );
		
		vec4 sampleRotate;
		{
			vec2 K = vec2( 23.14069263277926, 2.665144142690225 );
			float rnd = fract( cos( dot(vec2(s.screenCoord),K) ) * 12345.6789 );
			float sampleTheta = (2.0 * 3.141593) * rnd * uSheenDither;
			float sinTheta = sin(sampleTheta), cosTheta = cos(sampleTheta);
			sampleRotate = vec4( cosTheta, sinTheta, -sinTheta, cosTheta );
		}
	
		float lodBase = 0.5 * log2( (256.0*256.0)/float(SHEEN_IMPORTANCE_SAMPLES) );
		float NdotV   = abs( dot( s.normal, s.vertexEye) );
		specAlbedoV   = texture2D( tMicrofiberSheenAlbedoLUT, vec2(NdotV, roughness) ).x;

		vec3  spec = vec3(0.0, 0.0, 0.0);
		for( int i=0; i<SHEEN_IMPORTANCE_SAMPLES; i++ )
		{
			vec3 L;
			{
				//NOTE: sampling cosine weighted hemisphere since it's more effective than sampling NDF for grazing distributions
				//additionally sampling from NDF leads to poor directional albedo estimation which makes diffuse contribution too dark ~ms
				vec4 r = uSheenRands[i];
				float cosTheta = r.x; //sqrt(r.x)
				float sinTheta = r.y; //sqrt(1.0-r.x)
				vec2 dir = r.z * sampleRotate.xy + r.w * sampleRotate.zw;
				vec3 L_t = vec3( dir.x*sinTheta, dir.y*sinTheta, cosTheta );
				L = transformVecFrom( basis, L_t );
			}
			vec3 H = normalize( s.vertexEye + L );

			float NdotH = saturate( dot( s.normal, H ) );
			float NdotL = saturate( dot( s.normal, L ) );
			float HdotV = dot( H, s.vertexEye );

			specAlbedoL += texture2D( tMicrofiberSheenAlbedoLUT, vec2(NdotL, roughness) ).x;
			
			float D = NDF_Microfiber( NdotH, roughness );
			float G = G2_Microfiber( NdotL, NdotV, roughness );
			vec3  F = s.sheen;

			//microfacet pdf as if half vector was sampled from NDF
			float pdf = D * NdotH;
			pdf *= rcp( 4.0 * abs(HdotV) ); //divide PDF by the Jacobian of H->L transform
			float lod = lodBase - 0.5*log2( pdf );
			vec3 lightSample = textureCubeLod( tSheenReflectionCubeMap, L, lod ).rgb;

			float denom = 4.0 * INVPI * NdotV * NdotL; //non cancelled-out pdf & microfacet BRDF normalization terms
			spec += lightSample * F * D * G * rcpSafe( denom );
		}
		specAlbedoL *= (1.0/float(SHEEN_IMPORTANCE_SAMPLES));
		s.diffuseLight += spec * (1.0/float(SHEEN_IMPORTANCE_SAMPLES)) * uSheenReflectionBrightness;
	}

	//diffuse component
	{
		//l = 0 band
		vec3 d = uDiffuseLightSphere[0].xyz;

		//l = 1 band
		d += uDiffuseLightSphere[1].xyz * s.normal.y;
		d += uDiffuseLightSphere[2].xyz * s.normal.z;
		d += uDiffuseLightSphere[3].xyz * s.normal.x;

		//l = 2 band
		vec3 swz = s.normal.yyz * s.normal.xzx;
		d += uDiffuseLightSphere[4].xyz * swz.x;
		d += uDiffuseLightSphere[5].xyz * swz.y;
		d += uDiffuseLightSphere[7].xyz * swz.z;

		vec3 sqr = s.normal * s.normal;
		d += uDiffuseLightSphere[6].xyz * ( 3.0*sqr.z - 1.0 );
		d += uDiffuseLightSphere[8].xyz * ( sqr.x - sqr.y );

		//energy conservation term
		vec3 specAlbedo = min( oneminus(s.sheen * specAlbedoL), oneminus(s.sheen * specAlbedoV) );	

		//apply albedo & add
		s.diffuseLight += s.albedo.xyz * specAlbedo * d;
	}
}

void	DiffusionMicrofiberLight( inout FragmentState s, LightParams l )
{
	float roughness = max( s.sheenRoughness, 0.07 ); //I have a license to sheen!

	const float NdotL = saturate( dot( s.normal, l.direction ) );
	const float NdotV = abs( dot( s.vertexEye,s.normal ) );

	//scale diffuse based on directional reflection albedo to ensure energy conservation
	//see "A Microfacet Based Coupled Specular-Matte BRDF Model with Importance Sampling", Csaba Kelemen, László Szirmay-Kalos
	const vec3 albedoL = s.sheen * texture2DLod( tMicrofiberSheenAlbedoLUT, vec2(NdotL, roughness), 0.0 ).x;
	const vec3 albedoV = s.sheen * texture2DLod( tMicrofiberSheenAlbedoLUT, vec2(NdotV, roughness), 0.0 ).x;
	const vec3 throughput = min( oneminus( albedoL ), oneminus( albedoV ) );

	const TangentBasis tbn = createTangentBasisDir( s.normal, s.vertexEye );
	const LtcSample ltcSampleMicrofiber = SampleMicrofiberLTC(roughness, NdotV);
	const LtcSample ltcSampleLambertian = SampleLambertianLTC();

	float specularLTC = ltcEvaluate( ltcSampleMicrofiber, tbn, l );
	float diffuseLTC = ltcEvaluate( ltcSampleLambertian, tbn, l );
	vec3  specularBrdf = s.sheen * (ltcSampleMicrofiber.magnitude * specularLTC);
	vec3  diffuseBrdf = s.albedo.rgb * diffuseLTC * throughput;

	s.diffuseLight += l.color * l.shadow.rgb * l.attenuation * (diffuseBrdf + specularBrdf);
}

#define	DiffusionEnv	DiffusionMicrofiberEnv
#define	Diffusion		DiffusionMicrofiberLight
