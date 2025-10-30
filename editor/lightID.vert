//for selecting lights by their visible shape
#include "../common/util.sh"

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec2 uLightSize;
uniform int uSphere;

BEGIN_PARAMS
	INPUT_VERTEXID(vertexID)
	
	OUTPUT0(vec4, fVPPos)		//viewport position
	OUTPUT1(float, fZ)
	OUTPUT2(vec2, fTexCoord)
END_PARAMS
{

	//turn our point into a objectspace rectangle
	vec2 fCoord = vec2(	(vertexID > 1 && vertexID != 5) ? 1.0 : 0.0,
					(vertexID == 0 || vertexID > 3) ? 1.0 : 0.0	);
	fCoord = fCoord - 0.5;

	//we need viewport position and z depth relative to camera
	vec3 basePos = vec3(0.0, 0.0, 0.0);
	
	if(uSphere == 0)			//adjust for rectangle shape
	{ basePos.xy += fCoord * uLightSize; } 
	
	vec3 vertexPos = mulPoint(uModelMatrix, basePos).xyz;

	vertexPos = mulPoint(uViewMatrix, vertexPos).xyz;
	 if(uSphere == 1)			//adjust for rectangle shape
	 { vertexPos.xy += fCoord * uLightSize; }
	fZ = vertexPos.z;
	vec4 pos = mulPoint(uProjectionMatrix, vertexPos);

	OUT_POSITION = pos;
	fVPPos = pos;
	fTexCoord = fCoord;
}
