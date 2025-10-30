#include "data/shader/mat/state.frag"

void	ShadowMapMerge( inout FragmentState s )
{
	s.output0.x = length( s.vertexPosition );
}

#define	Merge	ShadowMapMerge