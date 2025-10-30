//just writes zeros to the strokebuffer
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
	//OUTPUT_COLOR1(vec4)
END_PARAMS

{
	OUT_COLOR0 = vec4(0.0, 0.0, 0.0, 0.0);
	//OUT_COLOR1 = vec4(0.0, 0.0, 0.0, 0.0);
}
