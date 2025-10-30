#include "../paint/layer/gbufferflags.sh"

BEGIN_PARAMS
    INPUT0(vec3, fPosition)
    INPUT1(vec3, fNormal)
    INPUT2(vec3, fTangent)
    INPUT3(vec3, fBitangent)

	OUTPUT_COLOR0(float)  //flags buffer
END_PARAMS
{
	uint flags = GBUFFER_FLAGS_GEOMETRY;
	OUT_COLOR0 = float(flags) / 255.0;
}
