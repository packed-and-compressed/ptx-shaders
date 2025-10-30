BEGIN_PARAMS
	INPUT0(vec3, fPosition)

	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
END_PARAMS
{
	OUT_COLOR0 = vec4( 0.0, 0.0, 1.0, 1.0 );
	OUT_COLOR1 = fPosition.zzzz; //lol its sleeping u guyz
}