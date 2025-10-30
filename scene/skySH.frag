#include "../common/ditherLdsBlueNoise.comp"

uniform int		uDither;
uniform vec4	uSkyCoefficients[9];

BEGIN_PARAMS
	INPUT0(vec3,skyBoxCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 d = normalize(skyBoxCoord);

	//l = 0 band
	vec3 r = uSkyCoefficients[0].xyz;

	//l = 1 band
	r += uSkyCoefficients[1].xyz * d.y;
	r += uSkyCoefficients[2].xyz * d.z;
	r += uSkyCoefficients[3].xyz * d.x;

	//l = 2 band
	vec3 swz = d.yyz * d.xzx;
	r += uSkyCoefficients[4].xyz * swz.x;
	r += uSkyCoefficients[5].xyz * swz.y;
	r += uSkyCoefficients[7].xyz * swz.z;

	vec3 sqr = d * d;
	r += uSkyCoefficients[6].xyz * ( 3.0*sqr.z - 1.0 );
	r += uSkyCoefficients[8].xyz * ( sqr.x - sqr.y );

	if (uDither)
	{
		r = ditherLdsBlueNoise( r, uint2(IN_POSITION.xy) );
	}
	
	OUT_COLOR0.xyz = r;
	OUT_COLOR0.w = 0.0;
}