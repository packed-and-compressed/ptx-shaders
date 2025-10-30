BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	vec2 coord = vec2( (vID == 1) ? 3.0 : -1.0, (vID == 2) ? 3.0 : -1.0 );
	OUT_POSITION.xy = coord;
	#ifdef RENDERTARGET_Y_DOWN
		coord.y = -coord.y;
	#endif
	fCoord = 0.5*coord + vec2(0.5,0.5);
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}