#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/other/shadowParams.frag"
#include "ltcLambertian.frag"

uniform vec4	uDiffuseLightSphere[9];

void	DiffusionLambertianEnv( inout FragmentState s )
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

	//apply albedo & add
	s.diffuseLight += s.albedo.xyz * d;
}
#ifndef Diffusion
#define	DiffusionEnv	DiffusionLambertianEnv
#endif

void	DiffusionLambertianLight( inout FragmentState s, LightParams l )
{
	const TangentBasis tbn = createTangentBasisDir( s.normal, s.vertexEye );
	const LtcSample ltcSample = SampleLambertianLTC();

	float ltc = ltcEvaluate( ltcSample, tbn, l );
	vec3 brdf = s.albedo.rgb * ltc;
	s.diffuseLight += l.color * l.shadow.rgb * l.attenuation * brdf;
}
#ifndef Diffusion
#define	Diffusion	DiffusionLambertianLight
#endif