uniform vec2	uShape; //{ transparency, sharpness }
uniform float	uNoiseSeed;

BEGIN_PARAMS
    INPUT0(vec3,fBrushCoord)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	//feather the brush stroke
	float feather = 1.0 - saturate(length(fBrushCoord));
	feather = uShape.x * pow( feather, (2.0+1.0e-6) - 2.0*uShape.y );
	if( feather <= 0.0 )
	{ discard; }

	//dither a bit
	if( feather > 0.0 )
	{
		float noise = fract(sin(dot(IN_POSITION.xy, vec2(12.9898,78.233)+uNoiseSeed)) * 43758.5453);
		noise = 2.0*noise - 1.0;
		feather = saturate( feather + (0.25/256.0) * noise );
	}
	
	OUT_COLOR0 = feather;
}
