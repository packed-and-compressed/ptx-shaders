
BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	fCoord = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
					(vID == 0 || vID > 3) ? 1.0 : 0.0	);
	OUT_POSITION.xy = fCoord * 2.0 - vec2(1.0, 1.0);
	fCoord.y = 1.0-fCoord.y;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}
