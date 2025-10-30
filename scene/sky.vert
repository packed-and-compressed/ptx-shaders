#include "../common/util.sh"

uniform mat4	uLightMatrix;
uniform mat4	uInverseView;
uniform mat4	uInverseProjection;

BEGIN_PARAMS
	INPUT0(vec2,pos)
	OUTPUT0(vec3,skyBoxCoord)
END_PARAMS
{
	vec4 p = OUT_POSITION = vec4( pos.x, pos.y, 0.999, 1.0 );
	vec3 dir = mul( uInverseProjection, p ).xyz;
	skyBoxCoord = mulVec( uLightMatrix, mulVec( uInverseView, dir ) );
}
