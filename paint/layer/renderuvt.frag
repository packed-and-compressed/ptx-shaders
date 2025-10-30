uniform int		uTriangleOffset;

BEGIN_PARAMS
	INPUT0( vec2, fTexCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	OUT_COLOR0.xy = fTexCoord;
	OUT_COLOR0.z = IN_PRIMITIVEID + uTriangleOffset;
	OUT_COLOR0.w = 0.0f;
}
