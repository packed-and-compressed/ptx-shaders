USE_TEXTURE2D(tImage);

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	INPUT1(vec4, fColor)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0 = fColor * texture2D( tImage, fTexCoord ).x;
}