#include "data/shader/common/packed.sh"
#include "data/shader/mat/hybridConstants.comp"
#include "data/shader/mat/reflection/sampleGGX.frag"

uint2 ReflectionGGXSample( in PathState path, in FragmentState fs, inout SampleState ss, inout uint specularLobe )
{
	ReflectionGGXSample( path, fs, ss );
	specularLobe |= HYBRID_GGX_FLAG;
#if defined( ReflectionSampleSecondary )
	fs.sampledGloss = fs.glossSecondary;
#else
	fs.sampledGloss = fs.gloss;
#endif
	// variance, -
	const uint packedVariance = packUnitFloat( 0.05f );
	return uint2( packedVariance << 16, 0 );
}