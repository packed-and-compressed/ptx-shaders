#include "../common/util.sh"

uniform mat4	uModelMatrix;
uniform mat4	uViewProjectionMatrix;
uniform ivec4   uViewRect;
uniform int 	uBufferHeight;

//raster space transform
uniform mat4	uRasterTransform;

#include "quickdrawshared.sh"

uniform float	uLineWidth;


BEGIN_PARAMS
	INPUT_VERTEXID(vID)
	INPUT0(vec3,	vPosition)	
	INPUT1(vec2,	vTexCoord)
	INPUT2(vec4,	vColor)
	INPUT3(vec4,	vColor2)
	INPUT4(vec3, 	vPos2)
	INPUT5(vec3,	vPrev)
	INPUT6(vec3,	vNext)
	
	OUTPUT0(vec4,	fColor1)
	OUTPUT1(vec4,	fColor2)
	OUTPUT2(vec2,	fP1)
	OUTPUT3(vec2,	fP2)
	OUTPUT4(float,	fWidth)
	OUTPUT5(vec2,	fTexCoord)
END_PARAMS
{
	vec4 curr = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, vPosition.xyz).xyz);
	vec4 next = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, vPos2.xyz).xyz);

	// compute direction from previous to current vertex
	vec2 dir = (curr.xy/curr.w) - (next.xy/next.w);		
	curr = applyRasterOffset(curr);
	next = applyRasterOffset(next);
	
	fP1 = toPixel(curr).xy;
	fP2 = toPixel(next).xy;
	fWidth = uLineWidth;		
	fColor1 = vColor;
	fColor2 = vColor2;

	// rotate dir by 90 degrees and divide out pixel aspect ratio (its a view-proj thing)
	vec2 mitr = dir.yx;
	mitr.y = -mitr.y;
	mitr /= (vec2)uViewRect.zw;
	mitr = normalize(mitr);

	vec2 weight;
	weight.x = uLineWidth * curr.w;
	weight.y = uLineWidth * curr.w;
	weight /= (vec2)uViewRect.zw;

	// expand line by vertex ID
	/*	0__2 4
		| // |
		1 3__5	*/

	unsigned int id = (unsigned int)vID;
	id = id % 6;
	vec2 coord = vec2(	(id > 1 && id != 3) ? 1.0 : 0.0,
	(fract(float(id)/2) == 0.0) ? 1.0 : 0.0);
	fTexCoord.x = vTexCoord.x;
	fTexCoord.y = coord.y;
	weight *= (1.0 - 2.0 * coord.y);
	vec4 finalPos = mix(curr, next, coord.x);
	finalPos.xy += weight * mitr.xy;
	OUT_POSITION = finalPos;
}
