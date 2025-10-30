#include "hit.frag"

uniform vec2	uHeightScaleBias;

void	HeightPosition( inout BakeHit h )
{
	float height = dot( h.dstNormal, h.hitPosition - h.dstPosition );
	height = saturate( height * uHeightScaleBias.x + uHeightScaleBias.y );

	h.output0 = vec4( height, height, height, 1.0 );
}

#define Intersection HeightPosition