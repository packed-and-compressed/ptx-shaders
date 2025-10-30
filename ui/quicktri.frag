
USE_TEXTURE2D(tTex);
uniform float uPremultAlpha;

void processColor(inout vec4 c, in vec2 uv)
{
	COLOR_PROCESSOR
}

BEGIN_PARAMS
	INPUT0(vec4,fColor)
	INPUT1(vec2, fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{	
	vec4 tex = texture2D(tTex, fTexCoord);
	OUT_COLOR0 = fColor * tex;
	OUT_COLOR0.rgb *= mix(tex.a, 1.0, uPremultAlpha);
	processColor(OUT_COLOR0, fTexCoord);
}
