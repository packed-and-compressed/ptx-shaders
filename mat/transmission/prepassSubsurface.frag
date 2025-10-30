#include "data/shader/mat/state.frag"

void    PrepassSubsurface( inout FragmentState s )
{
    //output translucency depth
    s.generic0.x = s.scatterDepth.x * 3.7;
}

#define	Diffusion	PrepassSubsurface
