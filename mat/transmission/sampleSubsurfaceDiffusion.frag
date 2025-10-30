#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/diffuse.comp"
#include "data/shader/scene/raytracing/bssrdf/burleydiffusion.comp"

void	TransmissionSubsurfaceDiffusionEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	if( path.isSubsurface )
	{
		evaluateBSSRDF_BurleyDiffusionDirection( ss, vec3(1.0,1.0,1.0) );
	}
	else
	{
		float roughness = fs.fuzzGlossMask ? (1.0 - fs.gloss) : 1.0;
		evaluateBTDF_DiffuseOut( ss, fs.transmissivity, fs.fuzz, roughness );
	}
}

void	TransmissionSubsurfaceDiffusionSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	if( path.isSubsurface )
	{
		sampleBSSRDF_BurleyDiffusionDirection( ss );
		ss.flagDiffuse = true;
	}
	else
	{
		sampleBTDF_Diffuse( ss );
#if defined(CPR_D3D)
		//fuzz is a retro-reflection component and needs half vector in the same hemisphere as view vector
		ss.H = normalize( ss.V - ss.L );
#elif defined(CPR_METAL)
		// By default we have fast math enabled, but the normalize here needs lots of precision
		ss.H = metal::precise::normalize( ss.V - ss.L );
#endif
	}
}

#define TransmissionEvaluate	TransmissionSubsurfaceDiffusionEvaluate
#define TransmissionSample		TransmissionSubsurfaceDiffusionSample
#define TransmissionSubsurface
#define TransmissionSubsurfaceDiffusion
