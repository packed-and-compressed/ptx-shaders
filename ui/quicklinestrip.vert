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

	OUTPUT0(vec4, fColor1)
	OUTPUT1(vec4, fColor2)
	OUTPUT2(vec2, fP1)
	OUTPUT3(vec2, fP2)
	OUTPUT4(float, fWidth)
	OUTPUT5(vec2, fTexCoord)
END_PARAMS
{
	//convert from old-style uniforms to the new vertex buffer method
	vec3 uP1 = vPosition.xyz;
	vec3 uP2 = vPos2.xyz;
	vec4 uColor1 = vColor;
	vec4 uColor1b = vColor2;
	vec2 uTex1 = vTexCoord;
	vec3 uPrevDir = vPrev.xyz;
	vec3 uNextDir = vNext.xyz;
	
	vec4 p1 = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, uP1).xyz);
	vec4 pPrev = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, uP1-uPrevDir).xyz);
	p1 = applyRasterOffset(p1);
	pPrev = applyRasterOffset(pPrev);
 
	vec2 prevDir = p1.xy/p1.w-pPrev.xy / pPrev.w;	//screenspace
	prevDir /= max(length(prevDir), 0.001);
	vec4 p2 = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, uP2).xyz);
	vec4 pNext = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, uP2 + uNextDir).xyz);
	p2 = applyRasterOffset(p2);
	pNext = applyRasterOffset(pNext);
	vec2 nextDir = pNext.xy/pNext.w-p2.xy/p2.w;
	nextDir /= max(length(nextDir), 0.001);

	vec2 myDir = p2.xy/p2.w - p1.xy/p1.w;
	myDir /= max(length(myDir), 0.001);
	vec2 frontButt = nextDir-myDir;
	vec2 backButt = myDir-prevDir;

	int id = vID%6;
	vec2 coord = vec2(	(id > 1 && id != 3) ? 1.0 : 0.0,
		(fract(float(id)/2) == 0.0) ? 1.0 : 0.0);
	float t = coord.x;
	fTexCoord = coord;
	fTexCoord.x = uTex1.x;
	float weightX = uLineWidth / float(uViewRect.z);
	float weightY = uLineWidth / float(uViewRect.w);
	float w = 3.0*(1.0-float(id != 1 && id != 3 && id != 5) * 2.0);

	vec2 otherDir =  mix(prevDir, nextDir, t);

	vec4 p = mix(p1, p2, t);

	vec2 miterButt =  mix(backButt, frontButt, t);
	vec2 squareNorm = normalize(vec2(p2.y/p2.w-p1.y/p1.w, p1.x/p1.w-p2.x/p2.w));
	vec2 butt = squareNorm;

	if(abs(otherDir.x*myDir.y - otherDir.y*myDir.x) > 0.001 && dot(miterButt, miterButt) > 0.001)	//if the lines aren't parallel, do the miter
	{ 
		if(dot(miterButt, butt) < 0.0)		//make sure the butt faces the same direction
		{ miterButt *= -1.0; }
	
		butt = normalize(miterButt);
//		butt *= mix(1.0, -1.0, step(0.5, t)); 
	}
	vec2 norm = butt * p.w;
	vec2 perp = vec2(weightX*norm.x, weightY*norm.y)*w;
	fColor1 = uColor1;
	fColor2 = uColor1b;
	OUT_POSITION = p;
	OUT_POSITION.xy += perp;

	fP1 = toPixel(p1);
	fP2 = toPixel(p2);

	fWidth = uLineWidth * 1.0;
}
