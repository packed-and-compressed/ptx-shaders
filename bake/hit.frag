#ifndef MSET_BAKE_HIT_FRAG
#define MSET_BAKE_HIT_FRAG

struct	BakeHit
{
	vec3	dstPosition;
	uint2	dstPixelCoord;
	vec2	dstTexCoord;
	vec3	dstTangent;
	vec3	dstBitangent;
	vec3	dstNormal;

	uint	hitMeshIndex;
	uint	hitTriangleIndex;
	vec3	hitBarycenter;
	uint	hitMaterialID;
	uint	hitShadingGroupObjectID;
	bool	rayWasSent;

	vec3	hitPosition;
	vec2	hitTexCoord;
	vec3	hitTangent;
	vec3	hitBitangent;
	vec3	hitNormal;
	vec4	hitColor;
	vec3	hitGeometricNormal;

	mat4	hitTransform;
	mat4	hitTransformInverseTranspose;

	vec4	output0;
};

#endif
