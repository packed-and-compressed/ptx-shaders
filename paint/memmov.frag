#ifdef USE_ARRAY
USE_TEXTURE2DARRAY(tTex);
uniform int uSlice;
#else
USE_TEXTURE2D(tTex);
#endif
BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
#ifdef USE_ARRAY
	OUT_COLOR0 = texture2DArray(tTex, vec3(fCoord, uSlice));
#else
	OUT_COLOR0 = texture2D(tTex, fCoord);
#endif
}
