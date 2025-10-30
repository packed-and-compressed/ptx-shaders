vec3	toneReinhard( vec3 c )
{
	c = max( c, 0.0 );
	//Typical Reinhard tone mapping operator, applied to luminance.
	//I've bumped brightness a bit here so that the [0,1] range occupies
	//more space on the curve. -jdr
	c *= 1.8;
	float l = dot( c, vec3(0.3333,0.3333,0.3333) );
	return saturate( c / (1.0 + l) );
}

#define	ToneMap	toneReinhard
