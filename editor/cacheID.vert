#include "../common/util.sh"

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)

END_PARAMS
{
	//we need viewport position and z depth relative to camera
	vec3 vertexPos = mulPoint(uViewMatrix, mulPoint(uModelMatrix, vPosition).xyz).xyz;
	vec4 pos = mulPoint(uProjectionMatrix, vertexPos);
	OUT_POSITION = pos;

}
