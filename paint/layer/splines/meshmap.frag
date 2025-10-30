BEGIN_PARAMS
	INPUT0(vec4, fPosition)
	INPUT1(vec2, fUV)
	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
	OUTPUT_COLOR2(vec4)
	OUTPUT_COLOR3(vec4)
END_PARAMS
{
	vec4 pos = fPosition / fPosition.w;
	vec3 nx = dFdx(pos).xyz;
	vec3 ny = dFdy(pos).xyz;
	OUT_COLOR0 = pos;
	OUT_COLOR1 = vec4(normalize(cross(ny, nx)), 1.0);

	OUT_COLOR2 = vec4(fUV, 0.f, 1.f);
	OUT_COLOR3 = vec4(dFdx(fUV), -dFdy(fUV));
}

