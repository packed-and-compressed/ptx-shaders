#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);
uniform ivec2 uBufferSize;
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	vec4 tex = texture2D(tTex, coord);
	vec2 dUV = vec2(1.0, 1.0) / vec2(uBufferSize);

	float right = texture2D(tTex, coord + vec2(dUV.x, 0.0)).x;
	float left = texture2D(tTex, coord + vec2(-dUV.x, 0.0)).x;
	float up = texture2D(tTex, coord + vec2(0.0, dUV.y)).x;
	float down = texture2D(tTex, coord + vec2(0.0, -dUV.y)).x;
	
	float downright = texture2D(tTex, coord + vec2(dUV.x, -dUV.y)).x;
	float upleft = texture2D(tTex, coord + vec2(-dUV.x, dUV.y)).x;
	float upright = texture2D(tTex, coord + vec2(dUV.x, dUV.y)).x;
	float downleft = texture2D(tTex, coord + vec2(-dUV.x, -dUV.y)).x;
	
	
	//if two neighbors are selected and this isn't, select this pixel
	float threshold = 0.5;
	float neighbors = step(threshold, right) + step(threshold, left) + step(threshold, up) + step(threshold, down);
	float maxNeighbor = max(right, max(left, max(up, down)));
	float maxFarNeighbor = max(downright, max(downleft, max(upright, upleft)));
	bool depthFailed = (tex.x == 2.0/255.0);	//this pixel failed the depth test in the last pass, but we flagged it

//	tex.x = max(tex.x, maxNeighbor * step(2.0, neighbors) * step(tex.x, 0.05));
	
	//if the depth test failed, we're much more generous about filling in a pixel from its neighbors
	tex.x = max(tex.x, max(maxNeighbor, maxFarNeighbor) * float(depthFailed));
	
	//if there's no geometry under this pixel and a neighbor is selected, select it too
	tex.x = mix(tex.x, maxNeighbor, float(tex.x == 0.0));
	tex.x *= step(2.1/255.0, tex.x);		//filter out the geometry indicator (2.0/255)
	OUT_COLOR0 = tex;

}
