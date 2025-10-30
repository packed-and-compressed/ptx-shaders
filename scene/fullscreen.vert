BEGIN_PARAMS
	INPUT0(vec4,vPosition)
	INPUT1(vec2,vTexCoord)
	
	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	vec2 tc = vTexCoord;
	#ifdef RENDERTARGET_Y_DOWN
		tc.y = 1.0 - tc.y;
	#endif
	fCoord = tc;
	
	OUT_POSITION = vPosition;
}