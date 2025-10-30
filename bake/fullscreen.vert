BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	fCoord = vec2( (vID == 1) ? 2.0 : 0.0, (vID == 2) ? 2.0 : 0.0 );
	OUT_POSITION.xy = 2.0*fCoord - vec2(1.0,1.0);
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}