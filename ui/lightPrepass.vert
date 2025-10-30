#include "../common/util.sh"

uniform mat4	uModelViewMatrix;
uniform mat4	uProjectionMatrix;
uniform vec3	uSize;

BEGIN_PARAMS
	INPUT0(vec3,vRadiusDirection)
	INPUT1(vec2,vRectDirections)
#ifndef PREPASS_MINIMAL
	OUTPUT0(vec3,fPosition)
#endif
END_PARAMS
{
	vec3 pos = vec3( vRectDirections.x*uSize.x,
					 vRectDirections.y*uSize.y,
					 0.0 );
	pos += uSize.z * vRadiusDirection;
	pos  = mulPoint( uModelViewMatrix, pos ).xyz;
#ifndef PREPASS_MINIMAL
	fPosition = pos;
#endif
	OUT_POSITION = mulPoint( uProjectionMatrix, pos );
}