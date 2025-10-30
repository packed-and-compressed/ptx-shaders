#include "data/shader/common/differential.sh"
#include "data/shader/mat/state.vert"

void initializeBaseSampleCoords( inout VertexState s, inout SampleCoord sampleCoord, diff3 dP, vec4 uvScaleBias, vec2 uvRotation )
{
    // NOOP
}

#define InitializeSampleCoords(s,dp,uvs,uvr)                initializeBaseSampleCoords(s,s.vertexTexCoord,dp,uvs,uvr)
#define InitializeMaterialStateSampleCoords(s,m,dp,uvs,uvr) initializeBaseSampleCoords(s,m.vertexTexCoord,dp,uvs,uvr)