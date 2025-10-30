#include "dilatePack.frag"

uniform vec3	uBackgroundColor;
uniform int		uPadDistanceSquared;
uniform int2	uImageSize;

USE_TEXTURE2D( tLUT );
USE_TEXTURE2D( tInput );

int2	wrap( int2 c )
{
	c.x =	(c.x >= uImageSize.x) ? c.x-uImageSize.x :
			(c.x < 0) ? c.x+uImageSize.x :
			c.x;
	c.y =	(c.y >= uImageSize.y) ? c.y-uImageSize.y :
			(c.y < 0) ? c.y+uImageSize.y :
			c.y;
	return c;
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	int2 pixelCoord = int2( IN_POSITION.xy );
	uint o = asuint( imageLoad( tLUT, pixelCoord ).x );

	int2 offset = int2( 0, 0 );
	int offsetDist2 = 0;
	if( o & DILATION_SOLID )
	{
		offset = unpackDilationOffset(o);
		offsetDist2 = offset.x*offset.x + offset.y*offset.y;
		if( offsetDist2 > uPadDistanceSquared )
		{ offset = int2(0,0); offsetDist2 = 0; }
	}

	vec4 c = vec4(0,0,0,0);
	if( offsetDist2 > 0 )
	{
		// Take 9 samples:
		// 0 1 2
		// 3 4 5
		// 6 7 8
		vec4 samples[9];
		samples[0] = imageLoad( tInput, wrap( pixelCoord + offset + int2(-1, 1) ) );
		samples[1] = imageLoad( tInput, wrap( pixelCoord + offset + int2( 0, 1) ) );
		samples[2] = imageLoad( tInput, wrap( pixelCoord + offset + int2( 1, 1) ) );

		samples[3] = imageLoad( tInput, wrap( pixelCoord + offset + int2(-1, 0) ) );
		samples[4] = imageLoad( tInput, wrap( pixelCoord + offset + int2( 0, 0) ) );
		samples[5] = imageLoad( tInput, wrap( pixelCoord + offset + int2( 1, 0) ) );

		samples[6] = imageLoad( tInput, wrap( pixelCoord + offset + int2(-1,-1) ) );
		samples[7] = imageLoad( tInput, wrap( pixelCoord + offset + int2( 0,-1) ) );
		samples[8] = imageLoad( tInput, wrap( pixelCoord + offset + int2( 1,-1) ) );

		//in order for samples to be viable, they must have an empty neighboring pixel
		#define empty(i) (samples[i].a <= 0.0)
		bool viable[9];
		viable[0] = empty(1) || empty(3);
		viable[1] = empty(0) || empty(2) || empty(4);
		viable[2] = empty(1) || empty(5);

		viable[3] = empty(0) || empty(4) || empty(6);
		viable[4] = true;
		viable[5] = empty(2) || empty(4) || empty(8);

		viable[6] = empty(3) || empty(7);
		viable[7] = empty(4) || empty(6) || empty(8);
		viable[8] = empty(5) || empty(7);

		//average the viable pixels
		float w = 0.0;
		HINT_UNROLL
		for( uint i=0; i<9; ++i )
		{
			vec4 s = samples[i];
			if( s.a > 0.0 && viable[i] )
			{
				s.rgb -= saturate(1.0 - s.a) * uBackgroundColor;
				s.rgb /= s.a;
				s.a = 1.0;
				c += s; w += 1.0;
			}
		}
		if( w > 0.0 )
		{ c /= w; }

		//add bg color back in, in case somehow no valid samples are found
		c.rgb += saturate(1.0 - c.a) * uBackgroundColor;
		c.a = 1.0;
	}
	else
	{
		//a single sample will do
		c = imageLoad( tInput, wrap( pixelCoord + offset ) );
		if( c.a > 0.0 )
		{
			//if this pixel is a blend with the background color, extract the background color.
			//then, divide alpha out of the color.
			c.rgb -= saturate(1.0 - c.a) * uBackgroundColor;
			c.rgb /= c.a;
			c.a = 1.0;
		}
	}

	OUT_COLOR0 = c;
}