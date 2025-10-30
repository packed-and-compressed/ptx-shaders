#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);
uniform vec4 uLineColor;
uniform ivec2 uBufferSize;

void sampleAt(in vec2 coord, in vec2 dUV, vec2 pxOffset, inout float minVal, inout float maxVal)
{
	vec2 p = coord + dUV * pxOffset;
	float val = texture2D(tTex, p).x;
	val *= step(0.0, p.x) * step(0.0, p.y) * step(p.x, 1.0) * step(p.y, 1.0);

	minVal = min(val, minVal);
	maxVal = max(maxVal, val);
}

void sampleFour(in vec2 coord, in vec2 dUV, vec2 pxOffset, inout float minVal, inout float maxVal)
{
	sampleAt(coord, dUV, vec2(pxOffset.x, pxOffset.y), minVal, maxVal);
	sampleAt(coord, dUV, vec2(-pxOffset.x, pxOffset.y), minVal, maxVal);
	sampleAt(coord, dUV, vec2(pxOffset.y, -pxOffset.x), minVal, maxVal);
	sampleAt(coord, dUV, vec2(-pxOffset.y, pxOffset.x), minVal,  maxVal);
}
	

BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	vec4 tex = texture2D(tTex, coord);
	vec2 dUV = vec2(1.0, 1.0) / vec2(uBufferSize);
	float minNeighbor = 1.0;
	float maxNeighbor = 0.0;
	
	//find the highest and lowest selection values for nearby pixels
	sampleFour(coord, dUV, vec2(1.5, 0.0), minNeighbor, maxNeighbor);
	sampleFour(coord, dUV, vec2(1.5, 1.5), minNeighbor, maxNeighbor);
	OUT_COLOR0 = uLineColor;
	OUT_COLOR0.a *= abs(maxNeighbor-minNeighbor);
}
