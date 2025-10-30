#include "../common/util.sh"

uniform mat4	uModelViewMatrix;
uniform mat4	uProjectionMatrix;
uniform vec3	uSize;

BEGIN_PARAMS
	INPUT0(vec3,vRadiusDirection)
	INPUT1(vec2,vRectDirections)
END_PARAMS
{
	vec3 pos = vec3( vRectDirections.x*uSize.x,
					 vRectDirections.y*uSize.y,
					 0.0 );
	pos += uSize.z * vRadiusDirection;
	OUT_POSITION = mulPoint( uProjectionMatrix, mulPoint( uModelViewMatrix, pos ).xyz );
}