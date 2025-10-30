#include "data/shader/mat/state.frag"

void	DiffusionUnlitEnv( inout FragmentState s )
{
	s.diffuseLight += s.albedo.xyz;
}

#define	DiffusionEnv	DiffusionUnlitEnv