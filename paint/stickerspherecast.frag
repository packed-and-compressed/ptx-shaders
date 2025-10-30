uniform vec3 uBaseNormal;
BEGIN_PARAMS
    INPUT0(vec3,fNormal)
    INPUT1(vec3,fLocalCoord)
	INPUT2(float, fAlphaMult)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0.rgb = fNormal;// * 0.5 + 0.5;
	OUT_COLOR0.a = fAlphaMult;
	//give greater weight to places further from the center
	vec2 dir = fLocalCoord.xy * 2.0 - 1.0;
	OUT_COLOR0.a = (1.0+8.0 * dot(dir, dir)) * 0.125;
}
