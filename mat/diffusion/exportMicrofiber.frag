#include "data/shader/mat/state.frag"

void    DiffusionMicrofiberExport( inout FragmentState s )
{
    s.generic2 = vec4( s.sheen, 1.0 );
}

#define Diffusion   DiffusionMicrofiberExport
