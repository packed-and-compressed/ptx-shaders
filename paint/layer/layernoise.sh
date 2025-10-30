#ifndef LAYER_NOISE_SH
#define LAYER_NOISE_SH

#include "../../common/rng.comp"

float rand( float seed )
{
	return fract( cos( seed ) * 12345.6789 );
}

float rand( vec2 seed )
{
	//Courtesy of Michael Pohoreski
	vec2 K = vec2(
		23.14069263277926, // e^pi (Gelfonds constant)
		2.665144142690225 // 2^sqrt(2) (Gelfond-Schneider constant)
	);
	return rand( dot(seed,K) );
}

float randNoMoire( vec2 seed )//same args as above, with no moire eels -MM
{
	return frac(sin(dot(vec2(sin(seed.x*10000), sin(seed.y*10000)), vec2(12.989f, 78.233f))) * 143758.5453f);
}

vec2 rand2( float seed )
{
	return vec2(rand(seed), rand(seed + 29.0));
}

vec3 rand3( float seed )
{
	float theta = 2.0 * 3.142 * rand( seed );
	float y = rand( seed + 31.0 ) * 2.0 - 1.0;
	float a = sqrt( 1.0 - y * y );
	return vec3( a * cos( theta ) , y, a * sin( theta ) );
}

vec3 rand3( vec2 seed )
{
	return rand3( dot( seed, vec2( 12.9898, 78.233 ) ) );
}

vec4 rand4( float seed )
{
	return vec4( rand( seed ), rand( seed + 3.0 ), rand( seed + 13.0 ), rand( seed + 29.0 ) );
}


vec4	layerDither8bitRGBA( vec4 c, ushort2 pixelCoord, uint additionalSeed = 7 )
{
	float incr = 1.0 / 255.0;
	vec4 m = frac( c * 255.0 );
	vec4 lo = c - m * incr;
	vec4 hi = lo + vec4( incr, incr, incr, incr );
	RNG rng = rngInit( pixelCoord, additionalSeed );
	float rnd = rngNextFloat(rng);
	
	c.x = (m.x <= rnd ? lo.x : hi.x);
	c.y = (m.y <= rnd ? lo.y : hi.y);
	c.z = (m.z <= rnd ? lo.z : hi.z);
	c.a = (m.a <= rnd ? lo.a : hi.a);
	return c;
}

vec4	layerDither8bitRGBA( vec4 c, vec2 noiseSeed )
{
	float incr = 1.0 / 255.0;
	vec4 m = frac( c * 255.0 );
	vec4 lo = c - m * incr;
	vec4 hi = lo + vec4( incr, incr, incr, incr );
	float rnd = rand( noiseSeed );

	
	c.x = (m.x <= rnd ? lo.x : hi.x);
	c.y = (m.y <= rnd ? lo.y : hi.y);
	c.z = (m.z <= rnd ? lo.z : hi.z);
	c.a = (m.a <= rnd ? lo.a : hi.a);
	return c;
}

vec3	layerDither8bit( vec3 c, vec2 noiseSeed )
{
	float incr = 1.0 / 255.0;
	vec3 m = frac( c * 255.0 );
	vec3 lo = c - m * incr;
	vec3 hi = lo + vec3( incr, incr, incr );
	float rnd = rand( noiseSeed );
	
	c.x = (m.x <= rnd ? lo.x : hi.x);
	c.y = (m.y <= rnd ? lo.y : hi.y);
	c.z = (m.z <= rnd ? lo.z : hi.z);

	return c;
}

float	layerDither8bitMono( float c, vec2 noiseSeed )
{
	float incr = 1.0 / 255.0;
	float m = frac( c * 255.0 );
	float lo = c - m * incr;
	float hi = lo + incr;
	float rnd = rand( noiseSeed );
	
	c = (m <= rnd ? lo : hi);

	return c;
}


#endif
