#ifndef MSET_VERTEX_STATE_H
#define MSET_VERTEX_STATE_H

#include "sampleCoord.sh"

struct	VertexState
{
	vec4				rasterPosition;
	vec2				motionVector;
	vec3				position;
	vec3				tangent;
	vec3				bitangent;
	vec3				normal;
	vec4				color;
	uint				vertexID;
	SampleCoord			texCoord;
};

#endif
