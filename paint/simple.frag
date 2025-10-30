BEGIN_PARAMS
INPUT0(vec2, fBufferCoord)
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	OUT_COLOR0.rgb = fBufferCoord.xyx;
	OUT_COLOR0.a = 1.0;
}