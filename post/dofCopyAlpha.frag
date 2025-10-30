USE_TEXTURE2D(tInput);

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0.x   = texture2D( tInput, fCoord ).w;
	OUT_COLOR0.yzw = vec3(0.0, 0.0, 0.0);
}
