#include "hit.frag"

void	AlphaMaskIntersection( inout BakeHit h )
{
	h.output0 = vec4( 1.0, 1.0, 1.0, 1.0 );
}

void	AlphaMaskMiss( inout BakeHit h )
{
	h.output0 = vec4( 0.0, 0.0, 0.0, 1.0 );
}

#define Intersection	AlphaMaskIntersection
#define Miss			AlphaMaskMiss