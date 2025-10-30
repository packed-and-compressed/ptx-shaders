#include "hit.frag"

uniform float	uCurve;

void	VertexColorIntersection( inout BakeHit h )
{
	vec4 c = h.hitColor;

	c.xyz = pow( c.xyz, uCurve );

	//Alpha is written to a slightly smaller range, and biased.
	//This lets us preserve a useful 0/1 signal for padding and resolving,
	//and this range is expanded later to restore the correct alpha value.
	//All this avoids allocating more memory, which is in short supply around here. -jdr
	
	//vertex alpha disabled until it can be resolved with padding. -jdr
	//c.a = saturate( c.a * ((255.0-8.0)/255.0) + (8.0/255.0) );
	c.a = 1.0;

	h.output0 = c;
}

#define Intersection	VertexColorIntersection
