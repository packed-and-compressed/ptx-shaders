#include "../common/util.sh"

uniform mat4	uModelMatrix;
uniform mat4	uViewProjectionMatrix;
uniform ivec4   uViewRect;
uniform int 	uBufferHeight;

//raster space transform
uniform mat4	uRasterTransform;

#include "quickdrawshared.sh"

uniform float	uPointSize;

BEGIN_PARAMS
	INPUT_VERTEXID(vID)
	INPUT0(vec3,	vPosition)	
	INPUT1(vec2,	vTexCoord)
	INPUT2(vec4,	vColor)
	INPUT3(vec4,	vColor2)
	INPUT4(vec3, 	vPos2)
	INPUT5(vec3,	vPrev)
	INPUT6(vec3,	vNext)

	OUTPUT0(vec4, fCoord)
	OUTPUT1(vec4, fColor)
	OUTPUT2(vec4, fColorb)
END_PARAMS
{
	vec4 p = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, vPosition.xyz).xyz);
	p = applyRasterOffset(p);

	unsigned int id = (unsigned int)vID;
	id = id % 6;
	vec2 coord = vec2(	
		(id > 1 && id != 5) ? 1.0 : -1.0,
		(id == 0 || id > 3) ? 1.0 : -1.0	
	);
	
	float weightX = uPointSize / float(uViewRect.z) * p.w;
	float weightY = uPointSize / float(uViewRect.w) * p.w;
		
	vec2 corner = vec2(weightX, weightY) * coord;
	p.xy += corner;

	OUT_POSITION = p;

	fCoord.xy = coord * 0.5;
	fCoord.zw = vec2(uPointSize, uPointSize);		
	
	fColor = vColor;
	fColorb = vColor2;
};
