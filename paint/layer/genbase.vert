uniform vec4	uViewportScaleBias;
uniform vec4	uQuads[16];

BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fBufferCoord)
END_PARAMS
{
	vec4 scaleBias = uViewportScaleBias;

	int vID = vertID%6;
	vec2 pos = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
						(vID == 0 || vID > 3) ? 0.0 : 1.0	);			
	vec4 blit = uQuads[vertID/6];
	fBufferCoord.xy = blit.xy + pos.xy * blit.zw;;
	//flip raster position so that all rendered results are upside down
	#ifdef RENDERTARGET_Y_DOWN
			scaleBias.w = -scaleBias.w;
			fBufferCoord.xy = blit.xy + pos.xy * (vec2(blit.z, -blit.w));
			fBufferCoord.y = 1.0 - blit.w - fBufferCoord.y;
			pos.y = 1.0 - pos.y;

	#else
	#endif
	pos = 2.0 * (blit.xy + blit.zw * pos) - vec2(1.0,1.0);
	pos = (pos * scaleBias.xy) + scaleBias.zw;
	OUT_POSITION.xy = pos;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}

