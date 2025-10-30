#include "../common/util.sh"
uniform mat4	uModelViewProjection;
uniform mat4	uModel;
BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec3,fPos)
END_PARAMS
{
	fPos = mulPoint(uModel, vPosition).xyz;
	OUT_POSITION = mulPoint( uModelViewProjection, fPos);
}
