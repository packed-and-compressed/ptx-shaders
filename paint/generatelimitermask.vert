BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fBufferCoord)
END_PARAMS
{
	OUT_POSITION.xy = fBufferCoord = vec2( vertID == 1 ? 3.0 : -1.0, vertID == 2 ? 3.0 : -1.0 );
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	
    fBufferCoord = fBufferCoord * 0.5 + vec2(0.5,0.5);
	#ifdef RENDERTARGET_Y_DOWN
		fBufferCoord.y = 1.0 - fBufferCoord.y;
	#endif
}
