#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/diffuse.comp"

void	DiffusionLambertianEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{
	float roughness = 1.0 - fs.gloss;
	evaluateBRDF_Diffuse( ss, fs.albedo.rgb, roughness );
}

void    DiffusionLambertianSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	sampleBRDF_Diffuse( ss );
	ss.flagDiffuse = true;
}

#define DiffusionEvaluate	DiffusionLambertianEvaluate
#define DiffusionSample		DiffusionLambertianSample
