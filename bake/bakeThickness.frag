#include "hit.frag"
#include "hemisphereSample.frag"

uniform float	uThicknessScale;
uniform float	uThicknessGamma;

void	Process( inout BakeHit h )
{
	HemisphereSample hs = hemisphereSample( h.hitPosition, -h.hitNormal, uHemisphereOffsetEstimate, ushort2(h.dstPixelCoord.xy), 0 );

	float dist = 1.0 - saturate( hs.thickness * uThicknessScale );
	dist = pow( dist, uThicknessGamma );

	h.output0 = vec4( dist, dist, dist, 1.0 );
}

float	Pack( vec4 v )
{
	//stores alpha/hit signal in low bit
	uint thick = asuint( v.x );
	uint alpha = v.w > 0.0 ? 1 : 0;
	return asfloat( (thick & ~uint(1)) | alpha );
}