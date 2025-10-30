#include "../common/util.sh"

uniform mat4	uModelMatrix;
uniform mat4	uViewProjectionMatrix;
uniform ivec4   uViewRect;

uniform int 	uBufferHeight;

//raster space transform
uniform mat4	uRasterTransform;

#include "quickdrawshared.sh"

BEGIN_PARAMS
	INPUT0(vec3,	vPosition)	
	INPUT1(vec2,	vTexCoord)
	INPUT2(vec4,	vColor)
	INPUT3(vec4,	vColor2)
	INPUT4(vec3, 	vPos2)
	INPUT5(vec3,	vPrev)
	INPUT6(vec3,	vNext)

	OUTPUT0(vec4,	fColor)
	OUTPUT1(vec2,	fTexCoord)
END_PARAMS
{
	vec4 p = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, vPosition.xyz).xyz);
	p = applyRasterOffset(p);
	fColor = vColor;
	fTexCoord = vTexCoord;
	OUT_POSITION = p;
}
