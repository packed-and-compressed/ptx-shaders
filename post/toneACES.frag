vec3	toneACES( vec3 c )
{
    //Sanitize negative values
	c = max( c, vec3(0.0, 0.0, 0.0) );

	//ACES RRT/ODT curve fit courtesy of Stephen Hill
	vec3 a = c * (c + 0.0245786) - 0.000090537;
	vec3 b = c * (0.983729 * c + 0.4329510) + 0.238081;
	return a / b;
}

#define	ToneMap	toneACES
