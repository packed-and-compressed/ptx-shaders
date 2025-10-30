USE_TEXTURE2D(tAperture);

BEGIN_PARAMS
	INPUT0(vec4,fColor)
	INPUT1(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0 = fColor * texture2D( tAperture, fCoord ).r;
}
