#include "hit.frag"
#include "hemisphereSample.frag"

void	Process( inout BakeHit h )
{
	HemisphereSample hs = hemisphereSample( h.hitPosition, h.hitNormal, uHemisphereOffsetEstimate, ushort2(h.dstPixelCoord.xy), 0 );
	h.output0.xyz = 0.5 * hs.bentNormal + vec3(0.5,0.5,0.5);
	h.output0.w = 1.0;
}

float	Pack( vec4 v )
{
	//10 bit xyz normal components, with alpha signal in 1 bit
	uint p = v.a > 0.0 ? 1 : 0;
	p |= uint( v.b * 1023.0 + 0.5 ) << 2;
	p |= uint( v.g * 1023.0 + 0.5 ) << 12;
	p |= uint( v.r * 1023.0 + 0.5 ) << 22;
	return asfloat(p);
}
