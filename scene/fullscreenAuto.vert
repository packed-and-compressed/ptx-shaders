//a quick automatic full screen vertex triangle that requires no vertex buffer

BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	fCoord.x = (vID == 1) ? 3.0 : -1.0;
	fCoord.y = (vID == 2) ? 3.0 : -1.0;
	OUT_POSITION.xy = fCoord;
	OUT_POSITION.zw = vec2( 0.9999, 1.0 );
}