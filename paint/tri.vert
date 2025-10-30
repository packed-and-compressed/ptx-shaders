#include "../common/util.sh"

uniform mat4	uModelMatrix;
uniform vec4	uP[3];
uniform vec4	uC[3];
uniform int		uOrder;
uniform mat4	uViewProjectionMatrix;

BEGIN_PARAMS
	INPUT_VERTEXID(vID)
	OUTPUT0(vec4,fColor)
END_PARAMS
{
	vec4 p = uP[0] * float(vID==0) + uP[1] * float(vID==1) + uP[2] * float(vID==2);
	vec4 c = uC[0] * float(vID==0) + uC[1] * float(vID==1) + uC[2] * float(vID==2);
	OUT_POSITION = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, p.xyz).xyz);
	fColor = c;
//	fColor.rgb = vec3(float(uOrder)*0.03);
	OUT_POSITION.z -= 0.0005;	//enhance visibility a bit
}	
