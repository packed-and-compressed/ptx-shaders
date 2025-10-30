uniform vec3 uOrigin;
uniform vec3 uAxis;
uniform float uScale;
uniform int	 uMirrorMode;
uniform vec4 uColor;
BEGIN_PARAMS
	INPUT0(vec3,fPos)
	
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float __tacos = 0.2;
	float _tacos = 0.2;
	vec3 toOrigin = uOrigin - fPos;
	float d = dot(toOrigin, uAxis);
	if(uMirrorMode == 0)
	{ d = length(toOrigin.xyz - uAxis * d) * 1.0; }
	float theta = d / uScale * (8.0 - 4.0 * float(uMirrorMode));
	float v = cos(theta);
	int cycle = int(abs(theta) / 6.28 + 0.5);

	//create a smooth line based on proximity to the peak of the sine wave
	vec3 dPdx = dFdx(fPos);
	vec3 dPdy = dFdy(fPos);
	vec3 dpd = (dPdx + dPdy) / uScale;
	float dP = abs(dot(dpd, uAxis));
	dP = mix(length(dpd), dP, float(uMirrorMode));
	float thick = 0.5;
	float v1 = smoothstep(1.0, 1.0 + dP * thick, v + dP * thick);
	thick = 0.125;
	float v2 = smoothstep(1.0, 1.0 + dP * thick, v + dP * thick);
	OUT_COLOR0 = uColor * v1;
	OUT_COLOR0.a = v1;
	OUT_COLOR0.rgb *= mix(v2, 1.0, 0.25);
	
}
