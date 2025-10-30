#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/diffuse.comp"

void	TransmissionSubsurfaceScatterEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	if( fs.frontFacing )
	{
		float roughness = fs.fuzzGlossMask ? (1.0 - fs.gloss) : 1.0;
		evaluateBTDF_DiffuseOut( ss, fs.transmissivity.rgb, fs.fuzz, roughness );
	}
	else
	{
		evaluateBTDF_DiffuseIn( ss, vec3(1.0,1.0,1.0) );
	}
}

void	TransmissionSubsurfaceScatterSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	sampleBTDF_Diffuse( ss );
	//fuzz is a retro-reflection component and needs half vector in the same hemisphere as view vector
	ss.H = normalize( ss.V - ss.L );
	ss.flagDiffuse = true;
}

#define TransmissionEvaluate	TransmissionSubsurfaceScatterEvaluate
#define TransmissionSample		TransmissionSubsurfaceScatterSample
#define TransmissionSubsurface
#define TransmissionSubsurfaceScatter
