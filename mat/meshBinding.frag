#ifndef MSET_V2_MESHBINDING_FRAG
#define MSET_V2_MESHBINDING_FRAG

struct  MeshBinding
{
	uint        triangleOffsetAndFlags;
	uint        baseBufferIndex;
	packed_vec2	texcoord0Offsets;
	packed_vec2	texcoord1Offsets;
};

#endif
