
USE_TEXTURE2D(tTex);
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	vec4 tex = texture2D(tTex, coord);
	tex = tex.rrrg;
	OUT_COLOR0 = tex;

}
