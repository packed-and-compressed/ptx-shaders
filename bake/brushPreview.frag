uniform vec2	uShape; //{ transparency, sharpness }

BEGIN_PARAMS
    INPUT0(vec3,fBrushCoord)

    OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//feather the brush stroke
	float feather = 1.0 - saturate( length( fBrushCoord ) );
	if( feather <= 0.0 )
	{ discard; }

	vec4 col = mix( vec4( 0.0, 0.0, 0.0, 0.0 ), vec4( 0.33, 0.43, 0.85, 0.75 ), pow( feather, (2.0+1.0e-6) - 2.0 ) );
	const vec4 brushOutline = vec4( 0.137, 0.427, 0.976, 1.0 );
	const float t0 = 1.0 - smoothstep( 0.0, 0.05, abs( feather ) );
	const float t1 = 1.0 - smoothstep( 0.0, 0.025, abs( feather - ( 1.0 - uShape.y ) ) );
	for (int i = 0; i < 4; ++i)
	{
		col = mix( col, brushOutline, t0 );
		col = mix( col, brushOutline, t1 );
	}
    OUT_COLOR0 = col;
}
