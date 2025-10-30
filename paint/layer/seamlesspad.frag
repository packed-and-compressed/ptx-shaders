#define SKIRT_PADDING
#include "skirtPadding.sh"

USE_TEXTURE2D(tTexture);

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 remote = getSeamlessUV(fTexCoord);
	OUT_COLOR0 = texture2D(tTexture, remote);
}
