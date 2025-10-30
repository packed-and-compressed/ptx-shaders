uniform vec3 uColor;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
    OUT_COLOR0.rgb = uColor;
    OUT_COLOR0.a = 1.0;
}