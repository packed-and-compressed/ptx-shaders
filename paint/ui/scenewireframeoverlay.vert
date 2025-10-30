#include "../../common/util.sh"
uniform vec4	uWireframeColor;
uniform mat4	uModelViewProjectionMatrix;
uniform vec2	uSSOffset;
BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec4,fColor)
END_PARAMS
{
	OUT_POSITION = mulPoint(uModelViewProjectionMatrix, vPosition);
	OUT_POSITION.xy += uSSOffset.xy * OUT_POSITION.w;
	fColor = uWireframeColor;
}
