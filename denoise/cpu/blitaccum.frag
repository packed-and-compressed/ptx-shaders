USE_TEXTURE2D(tColor);
USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tAlbedo);
USE_TEXTURE2D(tNormal);

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
	OUTPUT_COLOR2(vec4)
	OUTPUT_COLOR3(vec4)
END_PARAMS
{
	OUT_COLOR0 = texture2DLod( tColor, fCoord, 0 );
	OUT_COLOR1 = texture2DLod( tDepth, fCoord, 0 );
	OUT_COLOR2 = texture2DLod( tAlbedo, fCoord, 0 );
	OUT_COLOR3 = texture2DLod( tNormal, fCoord, 0 );
}
