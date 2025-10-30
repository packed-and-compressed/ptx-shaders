#include "paramsParallaxMap.frag"

void	DisplacementParallaxMap( in DisplacementParallaxMapParams p, inout MaterialState m )
{
	float displacement = textureMaterial( p.heightTexture, m.vertexTexCoord, 0.0 );
	displacement = p.brightnessContrastScaleBias.x * displacement + p.brightnessContrastScaleBias.y;
	m.displacement = vec3( displacement, displacement, displacement );
}

void	DisplacemenParallaxMapMerge( in MaterialState m, inout FragmentState s )
{
	s.displacement.xyz = m.displacement;
}

#define Displacement(p,m,s)			DisplacementParallaxMap(p.displacement,m)
#define DisplacementMerge			DisplacemenParallaxMapMerge
#define DisplacementApply(s)
