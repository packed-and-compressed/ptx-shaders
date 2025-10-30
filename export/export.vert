BEGIN_PARAMS
	INPUT0(vec2,vPosition)
	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	OUT_POSITION.xy = vPosition;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	fCoord = 0.5*vPosition + vec2(0.5,0.5);
}