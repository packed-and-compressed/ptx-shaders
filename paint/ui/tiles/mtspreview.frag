#include "data/shader/common/util.sh"

uniform vec3 uColor;

BEGIN_PARAMS
    OUTPUT_COLOR0(vec4)
END_PARAMS
{
    OUT_COLOR0 = vec4(uColor, 1.0);
}
