uniform int  uObjectID;
uniform int  uStartIndex;

vec2 splitU32(uint v)
{
	uint upper = v / 65536;
	uint lower = v - upper * 65536;
	
	return vec2(lower, upper) / 65535;
}

BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
    OUT_COLOR0.rg = splitU32(uObjectID);
	OUT_COLOR0.ba = splitU32(IN_PRIMITIVEID + uint(uStartIndex) / 3);
}
