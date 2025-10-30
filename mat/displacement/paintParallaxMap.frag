#include "paramsParallaxMap.frag"

void	DisplacementParallaxMap( in DisplacementParallaxMapParams p, inout MaterialState m )
{
	//NOTE: It is possible for parallax to override Height Map displacement value.
	// Addition will not work if the default displacement value is 0.5 --Andres
	float displacement = textureMaterial( p.heightTexture, m.vertexTexCoord, 0.0 );
	m.displacement = vec3( displacement, displacement, displacement );
}

void	DisplacemenParallaxMapMerge( in MaterialState m, inout FragmentState s )
{
	s.displacement.xyz = m.displacement;
}

#define Displacement(p,m,s)			DisplacementParallaxMap(p.displacement,m)
#define DisplacementMerge			DisplacemenParallaxMapMerge
#define DisplacementApply(s)
