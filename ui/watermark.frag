USE_TEXTURE2D(tImage);

uniform uint	uDark, uColored;

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 c = texture2D( tImage, fTexCoord );

	if( uColored )
	{
		if( uDark )
		{
			c.a *= 0.95;
		}
		else
		{
			if( max(c.r,max(c.g,c.b)) <= 0.0 )
			{ c.rgb = vec3(1,1,1); }
			c.a *= 0.7;
		}
	}
	else
	{
		if( uDark )
		{ c.rgb = vec3(0,0,0); c.a *= 0.95; }
		else
		{ c.rgb = vec3(1,1,1); c.a *= 0.7;}
	}

	OUT_COLOR0 = c;
}