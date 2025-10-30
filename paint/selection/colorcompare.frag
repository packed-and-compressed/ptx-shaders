#include "../../common/util.sh"


uniform vec2 uSamplePoint;
uniform uint2 uTexSize;
uniform float uTolerance;


USE_TEXTURE2D(tTex);
USE_TEXTURE2D(tSample);
float colorDist(vec4 ref, vec4 v)
{
	return length(ref-v);
}

BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS


{
	vec4 refColor = texture2D(tSample, vec2(uSamplePoint.x, uSamplePoint.y));
	vec4 colorHere = texture2D(tTex, vec2(fCoord.x, 1.0-fCoord.y)); 
	float d = colorDist(refColor, colorHere);
	OUT_COLOR0 = step(d, uTolerance *2.0);

}
