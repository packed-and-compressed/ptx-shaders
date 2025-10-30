#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/other/shadowParams.frag"
#include "data/shader/mat/other/scatterUtil.sh"

uniform mat4	uProjectionMatrix;
uniform mat4	uLightToViewMatrix;

uniform vec4	uScatterLightSphere[9];
uniform float	uNearPlane;
uniform float	uMillimeterScale;

struct ScatterParams 
{
	vec3  subdermisColor;
	float scatterDepth;
	
	vec3  translucencyColor;
	float translucencyScatter;
	float translucencyDepth;
	float translucencyMask;

	float fuzzScatter;

	float mask;
};
#define DiffusionParams ScatterParams

ScatterParams   computeScatterParams( inout FragmentState s )
{
    ScatterParams sp;
    sp.subdermisColor      = s.scatterColor;
    sp.scatterDepth        = s.scatterDepth.x * uMillimeterScale;

    sp.translucencyColor   = s.translucencyColor.rgb;
	sp.translucencyScatter = 0.1;
	sp.translucencyDepth   = sp.scatterDepth * 3.7;
	sp.translucencyMask    = maxcomp( sp.translucencyColor ) * s.translucencyColor.a;

	sp.fuzzScatter         = 0.3;

	//NOTE: previously, the only way to lerp to lambert completely was through subdermis.a
	// This was briefly attempted in 206 but we discontinued it for various content reaons.
	// I wish I remembered what they were :-/
	float mask = maxcomp( sp.subdermisColor );
	mask = 1.0 - mask;
	mask *= mask;
	mask *= mask;
	mask *= mask;	
	mask = 1.0 - (mask*mask);
	sp.mask = saturate( s.scatterDepth.x ) * mask;

	//FIXME: probably not the best place for this? ~ms	
	s.scatterColor = sp.subdermisColor; //needed for PaintMerge

    return sp;
}

void	DiffusionScatterEnv( inout FragmentState s, inout DiffusionParams scatter )
{
	scatter = computeScatterParams( s );
	
	//IBL
	//l = 0 band
	vec3 d = uScatterLightSphere[0].xyz;

	//l = 1 band
	d += uScatterLightSphere[1].xyz * s.normal.y;
	d += uScatterLightSphere[2].xyz * s.normal.z;
	d += uScatterLightSphere[3].xyz * s.normal.x;

	//l = 2 band
	vec3 swz = s.normal.yyz * s.normal.xzx;
	d += uScatterLightSphere[4].xyz * swz.x;
	d += uScatterLightSphere[5].xyz * swz.y;
	d += uScatterLightSphere[7].xyz * swz.z;

	vec3 sqr = s.normal * s.normal;
	d += uScatterLightSphere[6].xyz * ( 3.0*sqr.z - 1.0 );
	d += uScatterLightSphere[8].xyz * ( sqr.x - sqr.y );

	//ambient occlusion
	float AO = 1.0; //sampleOcclusionMask( s.screenTexCoord );
	
	s.diffuseLight += d * AO;

	//PROJECTION	
	//projection-space fragment coordinates	
	#ifdef RENDERTARGET_Y_DOWN 
		//D3D
		vec4 fpos = vec4( s.screenTexCoord.x, 1.0 - s.screenTexCoord.y, s.screenDepth, 1.0 );
	#else 
		//OGL
		vec4 fpos = vec4( s.screenTexCoord.x, s.screenTexCoord.y, s.screenDepth, 1.0 );
	#endif
	fpos.xy = (2.0 * fpos.xy) - vec2(1.0,1.0);
	
	//view-space fragment coordinates
	vec4 vpos = mulPoint(uLightToViewMatrix, s.vertexPosition);

	//define bounding box in view-space
	vec4 radius = vec4( scatter.scatterDepth, scatter.scatterDepth, scatter.scatterDepth, 0.0 );

	//find bounding box dimensions in projection-space
	vec4 nudgedPos = mul(uProjectionMatrix, vpos + radius);
	nudgedPos.xyz /= nudgedPos.w;
	vec3 spread = abs(nudgedPos.xyz - fpos.xyz);
	
	//SKIN BUFFERS
	#define UV_LIMIT_ENCODE 4.0
	spread = sqrt(UV_LIMIT_ENCODE * spread); //gamma curve, we prefer tiny UV spreads

	//Dividing scatter depth out of all z values normalizes depth compare to [-1,1] in the blur shader
	s.generic0.r =  (-vpos.z - uNearPlane) / scatter.scatterDepth;
	s.generic1.rgb = scatter.subdermisColor;
	s.generic1.a = scatter.mask;
	s.generic2.rgb = spread;
}

void	DiffusionScatterLight( inout FragmentState s, LightParams l, inout DiffusionParams scatter )
{
	adjustAreaLightDiffuse( l, s.vertexPosition );	
	float DP = dot(l.direction, s.normal);
	float lambert = saturate( (1.0/3.1415926) * DP );

	//TRANSLUCENCY
	float spread = scatter.translucencyScatter * 0.5;
	float wrap = wrapLightSquared(-DP, spread) * wrapLightSquaredIntegral(spread);

	//3x sets translucency color as a mid-point of the ramp
	//0.15 is the bias from pure white at ramp^0
	float ex = (-3.0 * l.shadow.a) + 3.15;

	vec3 ramp = (0.9975 * scatter.translucencyColor) + vec3(0.0025,0.0025,0.0025);
	ramp = pow(ramp*l.shadow.a, vec3(ex,ex,ex));
	
	s.diffuseLight += 
		(l.attenuation * l.color) *
		(lambert * l.shadow.rgb + wrap * ramp * scatter.translucencyMask);
}

//we replace these subroutines for the scatter pass
#ifdef DiffusionEnv
	#undef DiffusionEnv
#endif

#ifdef Diffusion
	#undef Diffusion
#endif

#define	DiffusionEnv	DiffusionScatterEnv
#define	Diffusion		DiffusionScatterLight
