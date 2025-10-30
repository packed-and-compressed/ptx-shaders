#include "../common/util.sh"
#include "../common/udimsample.sh"

uniform vec4	uMaterialUvScaleBias;
uniform vec2	uMaterialUvRotation;

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 texCoord = transformUV( fTexCoord, uMaterialUvScaleBias, uMaterialUvRotation );
	OUT_COLOR0 = sampleUDIM(texCoord);
}
