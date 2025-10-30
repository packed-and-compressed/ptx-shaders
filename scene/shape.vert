#include "data/shader/common/util.sh"

uniform mat4    uModelViewProjectionMatrix;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
END_PARAMS
{
    OUT_POSITION = mulPoint( uModelViewProjectionMatrix, vPosition );
}
