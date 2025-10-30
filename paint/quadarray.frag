#include "commonPaint.sh"
#include "../common/util.sh"

USE_TEXTURE2DARRAY(tTex);
uniform int uSlice;
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	vec4 tex = texture2DArray(tTex, vec3(coord, uSlice));
	OUT_COLOR0 = tex;

}
