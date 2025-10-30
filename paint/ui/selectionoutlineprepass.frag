#include "../commonPaint.sh"
#include "../../common/util.sh"
#ifdef UDIM_PREPASS
#include "../../common/udimsample.sh"
#else
USE_TEXTURE2D(tSelection);
#endif

BEGIN_PARAMS
	INPUT0(vec2, fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
#ifdef UDIM_PREPASS
	float selectionMask = sampleUDIM(fTexCoord).r;
#else
	float selectionMask = texture2D(tSelection, fTexCoord).r;
#endif

	vec4 overlayColor = vec4(0.0, 0.0, 0.0, 0.0);

	OUT_COLOR0 = vec4(0.05, 1.0, 0.0, 1.0);
	OUT_COLOR0 = mix(OUT_COLOR0, vec4(1, 0, 0, 1), 1.0-step(selectionMask, 0.5));
}
