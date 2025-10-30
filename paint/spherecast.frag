uniform vec3 uBaseNormal;
BEGIN_PARAMS
    INPUT0(vec3,fNormal)
    INPUT1(vec3,fLocalCoord)
	INPUT2(float, fAlphaMult)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0.rgb = fNormal;// * 0.5 + 0.5;
	OUT_COLOR0.a = 1.0;
	OUT_COLOR0.a = 1.0-step(1.0, length(fLocalCoord));
//	OUT_COLOR0.a = 1.0-step(1.0, abs(fLocalCoord.z));
	OUT_COLOR0.a *= 0.1 * fAlphaMult;
	float d = dot(normalize(fNormal), uBaseNormal) * -0.5 + 0.5;
	//attenuate slightly by distance to the center
	OUT_COLOR0.a /= (1.0+2.0 * dot(fLocalCoord, fLocalCoord));
	OUT_COLOR0.a *= d;
//	OUT_COLOR0.r = 1.0;
}
