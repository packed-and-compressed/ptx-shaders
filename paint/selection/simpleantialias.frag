#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);
uniform ivec2 uBufferSize;
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(float)
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

	//just grab half of our nearest neighbor
	float maxFarNeighbor = max(downright, max(downleft, max(upright, upleft)));
	float maxNeighbor = max(right, max(left, max(up, down)));
	maxNeighbor = max(maxNeighbor, maxFarNeighbor);
	
	OUT_COLOR0 = max(tex.x, maxNeighbor * 0.5);

}
