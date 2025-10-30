

BEGIN_PARAMS
INPUT0(vec4,fColor)
OUTPUT_COLOR0(vec4)
END_PARAMS
{
	if(fColor.r < 0.0 || fColor.g < 0.0 || fColor.r > 1.0 || fColor.g > 1.0)
		discard;
//	if(length(fColor.rg - vec2(0.5, 0.5)) > 0.5)
//	{ discard; }
	float checker = step(1.0, mod(mod(fColor.r * 8.0 + 256.0, 2.0) + step(1.0, mod(fColor.g * 8.0 + 256.0, 2.0)), 2.0));
	OUT_COLOR0 = fColor;

	OUT_COLOR0.a *= mix(checker, 1.0, 0.5);
//	if(fColor.r < 0.0 || fColor.g < 0.0 || fColor.r > 1.0 || fColor.g > 1.0)
//		OUT_COLOR0 = vec4(.1, .1, .7, .75);
	
}
