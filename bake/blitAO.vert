BEGIN_PARAMS
	INPUT_VERTEXID(vID)
END_PARAMS
{
	//unit square, 6 vertices
	vec2 coord = vec2(
		(vID >= 2 && vID <= 4) ? 1.0 : 0.0,
		(vID <= 0 || vID >= 4) ? 1.0 : 0.0
	);
	OUT_POSITION.xy = 2.0*coord - vec2(1.0,1.0);
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}