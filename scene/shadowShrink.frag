USE_TEXTURE2D(tInput);

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(float)
END_PARAMS
{
	OUT_COLOR0 = texture2D( tInput, fCoord ).x;
}
