#ifndef MSET_DITHER_SH
#define MSET_DITHER_SH

#include "../common/rng.comp"

vec3	dither8bit( vec3 c, uint2 pixelCoord, uint additionalSeed = 7 )
{
	float incr = 1.0 / 255.0;
	vec3 m = frac( c * 255.0 );
	vec3 lo = c - m * incr;
	vec3 hi = lo + vec3( incr, incr, incr );

	RNG rng = rngInit( ushort2(pixelCoord), additionalSeed );
	float rnd = rngNextFloat(rng);

	return vec3(	m.x <= rnd ? lo.x : hi.x,
					m.y <= rnd ? lo.y : hi.y,
					m.z <= rnd ? lo.z : hi.z	);
}

#endif
