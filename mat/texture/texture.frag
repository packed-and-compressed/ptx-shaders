#include "data/shader/common/differential.sh"
#include "data/shader/mat/state.frag"

void initializeBaseSampleCoords( inout FragmentState s, inout SampleCoord sampleCoord, diff3 dP, vec4 uvScaleBias, vec2 uvRotation )
{
    // NOOP
}

#define InitializeSampleCoords(p,s,dp,uvs,uvr)                  initializeBaseSampleCoords(s,s.vertexTexCoord,dp,uvs,uvr)
#define InitializeMaterialStateSampleCoords(p,s,m,dp,uvs,uvr)   initializeBaseSampleCoords(s,m.vertexTexCoord,dp,uvs,uvr)