#ifndef MSET_V2_RENDERABLE_FRAG
#define MSET_V2_RENDERABLE_FRAG

#include "data/shader/common/packed.sh"
#include "meshBinding.frag"

#define RENDERABLE_FLAG_CAST_SHADOWS 0x01

struct	Renderable
{
	MeshBinding		mesh;
	packed_mat3x4	transform;
	packed_mat3x4	transformInverse;
	uint			flags;
	uint			meshBase; //base buffer index for undeformed mesh
};
USE_STRUCTUREDBUFFER(Renderable,bRenderables);

#endif
