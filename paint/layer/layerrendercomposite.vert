uniform vec4 uViewportScaleBias;

BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fBufferCoord)
END_PARAMS
{
	vec4 scaleBias = uViewportScaleBias;
	vec2 pos = vec2(
		vertID == 1 ? 3.0 : -1.0,
		vertID == 2 ? 3.0 : -1.0 );
	fBufferCoord = pos;
	
	#ifdef RENDERTARGET_Y_DOWN
		fBufferCoord.y = -fBufferCoord.y;
		scaleBias.w = -scaleBias.w;
	#endif
	fBufferCoord = fBufferCoord*0.5 + vec2(0.5,0.5);

	pos = (pos * scaleBias.xy) + scaleBias.zw;
	OUT_POSITION.xy = pos;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}

