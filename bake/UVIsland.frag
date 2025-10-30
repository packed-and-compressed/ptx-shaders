vec3	colorFromID( float id )
{
	float hue = frac( id * 0.618033988749895 );

	//hsv -> rgb color
	vec3 color;
	float v = 1.0, s = 1.0;
	float c = v*s;
	float h = mod(hue*6.0,6.0);
	float x = c * (1.0 - abs(mod(h,2.0) - 1.0));

	HINT_FLATTEN
	if( h < 1.0 )
	{ color = vec3(c, x, 0.0); }
	
	else if( h < 2.0 )
	{ color = vec3(x, c, 0.0); }

	else if( h < 3.0 )
	{ color = vec3(0.0, c, x); }

	else if( h < 4.0 )
	{ color = vec3(0.0, x, c); }
	
	else if( h < 5.0 )
	{ color = vec3(x, 0.0, c); }

	else //if( h < 6.0 )
	{ color = vec3(c, 0.0, x); }

	return color;
}


BEGIN_PARAMS
	INPUT0(vec3,vPosition)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
    OUT_COLOR0.rgb = colorFromID( vPosition.z );
    OUT_COLOR0.a = 1.0;
}