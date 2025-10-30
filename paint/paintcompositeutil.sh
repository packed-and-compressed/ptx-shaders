

vec4 blendRGBA(vec4 bottom, vec4 top)
{
	bottom.rgb *= bottom.a * (1.0-top.a);
	top.rgb *= top.a;
	float outAlpha = (1.0-bottom.a) * top.a + bottom.a; 
	vec4 result = bottom + top;
	result.rgb /= max(outAlpha, 0.001);
	result.a = outAlpha;
	return result;
}
