#include "data/shader/common/util.sh"
#include "data/shader/mat/state.frag"

//implementation of "Solving Self-Intersection Artifacts in DirectX Raytracing"
//see https://developer.nvidia.com/blog/solving-self-intersection-artifacts-in-directx-raytracing/
float computeRayOffset( FragmentState state, vec3 position, vec3 triangleP0, vec3 triangleEdge01, vec3 triangleEdge02, vec3 triangleNormal, float triangleNormalScale )
{
	const float c0 = 5.9604644775390625E-8f;
	const float c1 = 1.788139769587360206060111522674560546875E-7f;
	const float c2 = 1.19209317972490680404007434844970703125E-7f;

	//compute twice the maximum extent of the triangle
	vec3 extent = abs(triangleEdge01) + abs(triangleEdge02) + abs( abs(triangleEdge01) - abs(triangleEdge02) );

	//bound object-space error due to reconstruction and intersection
	vec3 objectError = mad( c0, abs(triangleP0), c1 * maxcomp(extent) );

	//bound world-space error due to object-to-world transform
	vec3 worldError = mad( c1, mul( absMat(submatrix3x3(state.transform)), abs(position) ), c2 * abs(col3_xyz(state.transform)) );

	//bound object-space error due to world-to-object transform
	objectError = mad( c2, mulPoint( absMat(state.transformInverse), abs(state.vertexPosition) ), objectError );

	//compute world-space self-intersection avoidance offset
	float objectOffset = dot( objectError, abs(triangleNormal) );
	float worldOffset  = dot( worldError,  abs(state.geometricNormal) );
	return mad( triangleNormalScale, objectOffset, worldOffset );
}
