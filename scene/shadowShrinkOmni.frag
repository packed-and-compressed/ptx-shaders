USE_TEXTURECUBE(tInput);

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(float)
END_PARAMS
{
	//octahedral map transform
	vec3 dir;
	vec2 uv = 2.0*fCoord - vec2(1.0,1.0);
	if( (abs(uv.x) + abs(uv.y)) <= 1.0 )
	{
		//positive hemisphere
		dir = vec3( uv.x, 1.0-abs(uv.x)-abs(uv.y), uv.y );
	}
	else
	{
		//negative hemisphere
		vec2 signuv = sign(uv);
		uv = signuv - (signuv.x*signuv.y)*uv.yx;
		dir = vec3( uv.x, abs(uv.x)+abs(uv.y)-1.0, uv.y );
	}

	OUT_COLOR0 = textureCube( tInput, dir ).x;
}
