#include "../common/util.sh"

uniform mat4	uModelViewMatrix;
uniform mat4	uProjectionMatrix;
uniform vec4	uColor;
uniform float	uScale;
uniform float	uFadeBackSide;
uniform float	uAlpha;

BEGIN_PARAMS
	INPUT0(vec4,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(float,vWidth)
	INPUT3(vec4,vColor)
	INPUT4(vec2,vTexCoord)

	OUTPUT0(vec2,fTexCoord)
	OUTPUT1(vec4,fColor)
END_PARAMS
{
	vec4 pos = vPosition;
	pos = mul( uModelViewMatrix, pos );

	OUT_POSITION = mul( uProjectionMatrix, pos );

	vec4 color = vColor;

	fColor = vColor;
	
	fTexCoord = vTexCoord;
}