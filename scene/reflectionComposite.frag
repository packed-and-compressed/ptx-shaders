USE_TEXTURE2D(tInput);

uniform float	uBrightness;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
#ifdef COMPOSITE_DUAL
	OUTPUT_COLOR1(vec4)
#endif	
END_PARAMS
{
	vec3 input = uBrightness * texture2DLod( tInput, fCoord, 0.0 ).rgb;
	OUT_COLOR0 = vec4( input, 0.0 );
#ifdef COMPOSITE_DUAL
	OUT_COLOR1 = vec4( input, 0.0 );
#endif
}
