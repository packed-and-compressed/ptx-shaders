#include "../common/util.sh"

uniform mat4	uModelViewProjectionMatrix;
uniform vec3	uScale;
uniform vec4	uColor;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	OUTPUT0(vec2,fTexCoord)
	OUTPUT1(vec4,fColor)
END_PARAMS
{	
	vec3 v = 0.5 * vPosition * uScale;
	OUT_POSITION = mulPoint( uModelViewProjectionMatrix, v );
	fColor = uColor;
	fTexCoord = vPosition.xy * 0.5 + 0.5;
}  
