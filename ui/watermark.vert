#include "../common/util.sh"

uniform vec4	uPosition;
uniform vec2	uBasisX, uBasisY;

BEGIN_PARAMS
	INPUT0(vec2,vOffset)

	OUTPUT0(vec2,fTexCoord)
END_PARAMS
{
	vec4 pos = uPosition;
	pos.xy += vOffset.x * uBasisX + vOffset.y * uBasisY;
	OUT_POSITION = pos;
	fTexCoord = vOffset*0.5 + vec2(0.5,0.5);
}