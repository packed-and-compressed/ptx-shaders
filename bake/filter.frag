#include "dither.frag"

USE_TEXTURE2D(tInput);

uniform vec2	uPixelSize;
uniform vec2	uStdDev; //{ 1/(sqrt(2*pi)*s), 1/(2 * s^2) }
uniform int		uDither;

float	gaussian( float dx, float dy )
{
	float d2 = dx*dx + dy*dy;
	return uStdDev.x * exp( -d2 * uStdDev.y );
}

vec4	weightedSample( vec2 coord, float dx, float dy )
{
	vec4 s = texture2DLod( tInput, coord + uPixelSize*vec2(dx,dy), 0.0 );
	float g = gaussian( dx, dy );
	float msk = (s.a > 0.0 ? g : 0.0);
	s.rgb *= msk; s.a = msk;
	return s;
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 r = texture2DLod( tInput, fCoord, 0.0 );

	HINT_BRANCH
	if( r.a > 0.0 )
	{
		r = vec4(0.0,0.0,0.0,0.0);

		HINT_UNROLL
		for( int i=-1; i<=1; ++i )
		for( int j=-1; j<=1; ++j )
		{
			r += weightedSample( fCoord, float(i), float(j) );
		}
		if( r.a > 0.0 )
		{ r.rgb /= r.a; r.a = 1.0; }

		if( uDither > 0 )
		{ r.rgb = dither8bit( r.rgb, uint2(IN_POSITION.xy) ); }
	}

	OUT_COLOR0 = r;
}