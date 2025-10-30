#include "hit.frag"

vec3	colorFromID( uint id )
{
	float hue = frac( float(id) * 0.618033988749895 );
	float val = 1.0 - 0.65 * frac( float(id) * (1.0/9.0) );
	val *= val;
	float sat = 1.0;

	//hsv -> rgb color
	vec3 color;
	float c = val * sat;
	float h = mod( hue * 6.0, 6.0 );
	float x = c * ( 1.0 - abs( mod( h, 2.0 ) - 1.0) );

	HINT_FLATTEN
	if( h < 1.0 )
	{ color = vec3(c, x, 0.0); }
	
	else if( h < 2.0 )
	{ color = vec3(x, c, 0.0); }

	else if( h < 3.0 )
	{ color = vec3(0.0, c, x); }

	else if( h < 4.0 )
	{ color = vec3(0.0, x, c); }
	
	else if( h < 5.0 )
	{ color = vec3(x, 0.0, c); }

	else //if( h < 6.0 )
	{ color = vec3(c, 0.0, x); }

	float mn = val - c;
	color += vec3( mn, mn, mn );

	return color;
}

#ifdef ID_BAKE_GROUP
	uniform uint	uGroupID;
#endif

void	IDIntersection( inout BakeHit h )
{
	uint id = 0;

	#if defined(ID_BAKE_MATERIAL)
		id = h.hitMaterialID;
	#elif defined(ID_BAKE_GROUP)
		id = uGroupID;
	#elif defined(ID_BAKE_OBJECT)
		id = h.hitMeshIndex;
	#endif

	h.output0.xyz = colorFromID( id );
}

#define Intersection	IDIntersection
