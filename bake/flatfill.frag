uniform vec4	uColor;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0 = uColor;
}