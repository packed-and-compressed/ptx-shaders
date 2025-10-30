#include "dilatePack.frag"

uniform float	uPadDistance;

USE_TEXTURE2D( tLUT );
USE_TEXTURE2D( tInput );

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	int2 pixelCoord = int2( IN_POSITION.xy );

	uint o = asuint( imageLoad( tLUT, pixelCoord ).x );
	vec2 offset = vec2(0,0);
	float offsetSize = 0.0;
	if( o & DILATION_SOLID )
	{
		offset = vec2( unpackDilationOffset(o) );
		offsetSize = length( offset );
		if( offsetSize > uPadDistance )
		{ offsetSize = 0.0; offset = vec2(0,0); }
	}

	vec4 c = vec4(0,0,0,0);
	if( offsetSize > 2.0 )
	{
		//perform a 2D blur, to soften banding
		float w = 0.0;
		for( int i=-2; i<=2; ++i )
		for( int j=-2; j<=2; ++j )
		{
			vec4 ld = imageLoad( tInput, pixelCoord + int2(i,j) );
			if( ld.a > 0.0 )
			{
				c += ld;
				w += 1.0;
			}
		}
		c *= 1.0/w;
	}
	else
	{
		//single sample
		c = imageLoad( tInput, pixelCoord );
	}

	c.a = 1.0;
	OUT_COLOR0 = c;
}