USE_TEXTURE2D(tInput);
BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//rgba input
	OUT_COLOR0 = texture2D( tInput, fCoord );
}