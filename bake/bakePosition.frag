#include "hit.frag"

uniform vec3	uPositionMin, uPositionMax;
uniform int		uNormalizationMode;

void	PositionIntersection( inout BakeHit h )
{
	vec3 p = h.hitPosition;
	vec3 boxDimensions = uPositionMax - uPositionMin;

	if( uNormalizationMode == 0 )
	{
		p -= uPositionMin;
		p /= boxDimensions;
	}
	else if( uNormalizationMode == 1 )
	{
		float boxMaxDimension = max( boxDimensions.x, max( boxDimensions.y, boxDimensions.z ) );
		vec3 stretch = boxDimensions / boxMaxDimension;
		vec3 stretchBounds = ( 1.0 - stretch ) / 2.0;

		p -= uPositionMin;
		p /= boxDimensions;

		p *= stretch;
		p += stretchBounds;
	}
	
	h.output0.rgb = p;
}

#define Intersection PositionIntersection