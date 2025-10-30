#include "../common/util.sh"

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)

	
	OUTPUT0(vec4, fVPPos)		//viewport position
	OUTPUT1(float, fZ)
	OUTPUT2(vec2, fTexCoord)
END_PARAMS
{
	//we need viewport position and z depth relative to camera
	vec3 vertexPos = mulPoint(uViewMatrix, mulPoint(uModelMatrix, vPosition).xyz).xyz;
	fZ = vertexPos.z;
	vec4 pos = mulPoint(uProjectionMatrix, vertexPos);
	OUT_POSITION = pos;
	fVPPos = pos;
	fTexCoord = vec2(0.0, 0.0);	//unused
}
