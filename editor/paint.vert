uniform vec3	uBrush;	// { centerX, centerY, radius }

BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	fCoord = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
					(vID == 0 || vID > 3) ? 1.0 : 0.0	);
	fCoord = 2.0*fCoord - vec2(1.0,1.0);

	vec2 p = uBrush.xy + uBrush.z*fCoord;
	OUT_POSITION.xy = 2.0*p - vec2(1.0,1.0);
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}