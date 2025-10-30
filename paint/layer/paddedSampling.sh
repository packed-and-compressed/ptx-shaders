#ifndef PADDED_SAMPLING_SH
#define PADDED_SAMPLING_SH

#include "layerformat.sh"

#define sampleBackingTexture( buffer, uv )		formatBackingColor( uBackingFormat, texture2DLod( buffer, uv, 0.0 ) )

vec4 getTexSample( vec2 sampleCoord ) 
{
	return sampleBackingTexture( tTexture, sampleCoord );
}

vec4 getTexSamplePremult( vec2 sampleCoord ) 
{
	vec4 tap = sampleBackingTexture( tTexture, sampleCoord );
	tap.rgb *= tap.a;
	return tap;
}

#endif