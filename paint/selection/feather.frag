#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);
uniform ivec2 uBufferSize;
uniform int	  uRadius;
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS

//this is basically a blur pass
{
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	float totalVal = 0.f;
	float totalWeight = 0.f;
	vec2 dUV = vec2(1.0, 1.0) / vec2(uBufferSize);
	for(int x = -uRadius; x <= uRadius; x++)
	{
		for(int y = -uRadius; y <= uRadius; y++)
		{
			float value = texture2DLod(tTex, coord + vec2(dUV.x * float(x), dUV.y * float(y)), 0).r;
			float weight = saturate(rsqrt(float(x*x+y*y+1)));
			totalVal += value * weight;
			totalWeight += weight;
		}
	}

	OUT_COLOR0 = totalVal / max(totalWeight, 0.0);
//	float value = texture2D(tTex, coord).r;
//	OUT_COLOR0.r = value * float(uRadius) * 0.05;
//	OUT_COLOR0.r *= float(count) * 0.1;

}
