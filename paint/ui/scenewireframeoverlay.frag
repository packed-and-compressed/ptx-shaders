uniform vec2 uCursorCoords;
uniform float uFalloffStart;
uniform float uFalloffDistance;

BEGIN_PARAMS
	INPUT0(vec4,fColor)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float dist = length(uCursorCoords-IN_POSITION.xy);
	float mult = 1.0 - smoothstep(uFalloffStart, uFalloffStart + uFalloffDistance, dist);
	OUT_COLOR0 = vec4(fColor.rgb, fColor.a * mult);
}
