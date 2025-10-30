#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/other/scatterUtil.sh"

uniform vec4	uRefractionLightSphere[9];

struct ScatterRefractionParams 
{
#ifdef DiffusionParams
	DiffusionParams innerParams;
#endif
	vec3 scatterRefraction;
};

void	DiffusionScatterRefractionEnv( inout FragmentState s, inout ScatterRefractionParams diffParams )
{
	#ifdef DiffusionEnv
		#ifdef DiffusionParams
			DiffusionEnv( s, diffParams.innerParams );
		#else
			DiffusionEnv( s );
		#endif
	#endif

	//l = 0 band
	vec3 d = uRefractionLightSphere[0].xyz;

	//l = 1 band
	d += uRefractionLightSphere[1].xyz * s.normal.y;
	d += uRefractionLightSphere[2].xyz * s.normal.z;
	d += uRefractionLightSphere[3].xyz * s.normal.x;

	//l = 2 band
	vec3 swz = s.normal.yyz * s.normal.xzx;
	d += uRefractionLightSphere[4].xyz * swz.x;
	d += uRefractionLightSphere[5].xyz * swz.y;
	d += uRefractionLightSphere[7].xyz * swz.z;

	vec3 sqr = s.normal * s.normal;
	d += uRefractionLightSphere[6].xyz * ( 3.0*sqr.z - 1.0 );
	d += uRefractionLightSphere[8].xyz * ( sqr.x - sqr.y );

	diffParams.scatterRefraction = s.mediumScatter * d;
}

void	DiffusionScatterRefraction( inout FragmentState s, LightParams l, inout ScatterRefractionParams diffParams )
{
	#ifdef Diffusion
		#ifdef DiffusionParams
			Diffusion( s, l, diffParams.innerParams );
		#else
			Diffusion( s, l );
		#endif
	#endif

	adjustAreaLightDiffuse( l, s.vertexPosition );	
	float DP = dot(l.direction, s.normal);
	float lambert = saturate( (1.0/3.1415926) * DP );
	float attenuation = l.toSource.w > 0 ? ( l.invDistance * l.invDistance ) : 1.0;

	//TRANSLUCENCY
	float spread = 0.05;
	float wrap = wrapLightSquared(-DP, spread) * wrapLightSquaredIntegral(spread);

	//3x sets translucency color as a mid-point of the ramp
	//0.15 is the bias from pure white at ramp^0
	float ex = (-3.0 * l.shadow.a) + 3.15;

	vec3 ramp = (0.9975 * s.scatterColor.rgb) + vec3(0.0025,0.0025,0.0025);
	ramp = pow(ramp*l.shadow.a, vec3(ex,ex,ex));
	
	float translucencyMask = max(max(s.scatterColor.r, s.scatterColor.g), s.scatterColor.b);

	diffParams.scatterRefraction += 
		s.mediumScatter *
		(attenuation * l.color) *
		(lambert * l.shadow.rgb + wrap * ramp * translucencyMask);
}

void	DiffusionScatterRefractionFinalize( inout FragmentState s, inout ScatterRefractionParams diffParams )
{
	#ifdef DiffusionFinalize
		#ifdef DiffusionParams
			DiffusionFinalize( s, diffParams.innerParams );
		#else
			DiffusionFinalize( s );
		#endif
	#endif

	s.diffuseLight = mix( s.diffuseLight, diffParams.scatterRefraction, s.transmissivity.r );
}

//we replace these subroutines for the scatter pass
#define DiffusionParams ScatterRefractionParams

#ifdef DiffusionEnv
	#undef DiffusionEnv
#endif

#ifdef Diffusion
	#undef Diffusion
#endif

#ifdef DiffusionScatterRefractionFinalize
	#undef DiffusionScatterRefractionFinalize
#endif

#define	DiffusionEnv		DiffusionScatterRefractionEnv
#define	Diffusion			DiffusionScatterRefraction
#define DiffusionFinalize	DiffusionScatterRefractionFinalize

