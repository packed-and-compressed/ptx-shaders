#include "paramsParallaxMap.frag"

void	DisplacementParallaxMap()
{
	// NOOP
}

void	DisplacemenParallaxMapMerge( in MaterialState m, inout FragmentState s )
{
	// NOOP
}

#define Displacement(p,m,s)			DisplacementParallaxMap()
#define DisplacementMerge			DisplacemenParallaxMapMerge
#define DisplacementApply(s)
