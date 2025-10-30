//for selecting GUI sprite objects in the viewport
#include "../common/util.sh"

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform ivec2 uBufferSize;

BEGIN_PARAMS
	INPUT_VERTEXID(vertexID)

	OUTPUT0(vec4, fVPPos)		//viewport position
	OUTPUT1(float, fZ)
	OUTPUT2(vec2, fTexCoord)
END_PARAMS
{

	//we need viewport position and z depth relative to camera
	vec3 vertexPos = mulPoint(uViewMatrix, mulPoint(uModelMatrix, vec3(0.0, 0.0, 0.0)).xyz).xyz;
	fZ = vertexPos.z;
	vec4 pos = mulPoint(uProjectionMatrix, vertexPos);

	//turn our point into a screenspace square
	vec2 fCoord = vec2(	(vertexID > 1 && vertexID != 5) ? 1.0 : 0.0,
					(vertexID == 0 || vertexID > 3) ? 1.0 : 0.0	);
	fCoord = fCoord * 2.0 - 1.0;
	float pixelSize = 16.0;
	vec2 delta = fCoord / vec2(uBufferSize) * pixelSize;

	pos.xy += delta * pos.w;
	OUT_POSITION = pos;
	fVPPos = pos;
	fTexCoord = vec2(0.0, 0.0);	//unused
}
