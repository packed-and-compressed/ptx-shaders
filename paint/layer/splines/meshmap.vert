#include "../../../common/util.sh"

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	OUTPUT0(vec4, fPosition)
	OUTPUT1(vec2, fUV)
END_PARAMS
{
	//we need viewport position and z depth relative to camera
	vec3 vertexPos = mulPoint(uViewMatrix, mulPoint(uModelMatrix, vPosition).xyz).xyz;
	vec4 pos = mulPoint(uProjectionMatrix, vertexPos);
	fPosition = mulPoint(uModelMatrix, vPosition);
	fUV = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	OUT_POSITION = pos;

}
