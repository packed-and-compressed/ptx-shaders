uniform vec4 uSrc;
uniform vec4 uDest;
BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fCoord)
END_PARAMS
{
	vec2 uv  = vec2(	(vertID > 1 && vertID != 5) ? 1.0 : 0.0,
					(vertID == 0 || vertID > 3) ? 1.0 : 0.0	);
	vec4 dst = uDest;
	dst.y = 1.0 - dst.y - dst.w;
	vec4 src = uSrc;
	src.y += src.w;
	src.w *= -1.0;
	OUT_POSITION = vec4(dst.xy + dst.zw * uv, 0.0, 1.0);
	OUT_POSITION.xy = OUT_POSITION.xy * 2.0 -1.0;

	fCoord = src.xy + src.zw * uv;
	fCoord.y = 1.0-fCoord.y;
	
}

