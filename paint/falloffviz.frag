#include "commonPaint.sh"
uniform float uFalloffAmount;
uniform float uMaxAngle;
uniform vec3 uPaintColor;
BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 coord = fCoord * 2.0 - 1.0;
	if(length(coord) < 1.0)
	{
		float dp = coord.x * -1.0;
		vec3 norm = vec3(coord.xy, sqrt(1.0-coord.x*coord.x-coord.y*coord.y));
		vec3 light = normalize(vec3 (-1.0, -2.0, -1.0));
		float lightDot = - 0.5 * dot(norm, light) + 0.5;
		lightDot = pow(lightDot, 1.5);
		lightDot = saturate(0.00 + saturate(lightDot));
		float val = angleFalloff(dp, uMaxAngle, uFalloffAmount);
		vec3 baseColor = vec3(1.0, 1.0, 1.0);
		OUT_COLOR0.rgb = mix(baseColor, uPaintColor, val) * lightDot;
		OUT_COLOR0.a = 1.0;
	}
	else
	{
		discard;
	}
}
