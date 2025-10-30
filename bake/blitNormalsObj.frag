#include "dither.frag"

USE_TEXTURE2D( tInput );

uniform vec3	uClearColor;
uniform uint	uDither;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	uint2 pixelCoord = uint2(IN_POSITION.xy);

	vec4 c = imageLoad( tInput, pixelCoord );
	c.xyz += (1.0 - c.a) * uClearColor;

	if( uDither )
	{ c.xyz = dither8bit( c.xyz, pixelCoord ); }

	OUT_COLOR0 = c;
}