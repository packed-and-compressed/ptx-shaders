#include "data/shader/mat/state.frag"

#ifndef GLOSS_MAP_ROUGHNESS
#define GLOSS_MAP_ROUGHNESS (1u<<28)
#endif

struct	MicrosurfaceGlossMapParams
{
	uint  scaleBias;
	uint  texture;
};
void    MicrosurfaceGlossMap( in MicrosurfaceGlossMapParams p, inout MaterialState m, in FragmentState s )
{
	float gloss = textureMaterial( p.texture, m.vertexTexCoord, 1.0 );
	_p(m.glossOrRoughness) = scaleAndBias( gloss, p.scaleBias );
	_p(m.glossFromRoughness) = p.texture & GLOSS_MAP_ROUGHNESS;
}

void	MicrosurfaceGlossMapMerge( in MaterialState m, inout FragmentState s )
{
    float glossOrRoughness = _p( m.glossOrRoughness );
	_p(s.gloss) = _p(m.glossFromRoughness) ? saturate( 1.0 - glossOrRoughness ) : glossOrRoughness;
}

#ifdef SUBROUTINE_SECONDARY
	#define MicrosurfaceParamsSecondary			MicrosurfaceGlossMapParamsSecondary
	#define	MicrosurfaceSecondary(p,m,s)		MicrosurfaceGlossMapSecondary(p.microsurfaceSecondary,m,s)
	#define MicrosurfaceMergeSecondary			MicrosurfaceGlossMapMergeSecondary
	#define MicrosurfaceMergeFunctionSecondary	MicrosurfaceGlossMapMergeSecondary
#else
	#define MicrosurfaceParams					MicrosurfaceGlossMapParams
	#define	Microsurface(p,m,s)					MicrosurfaceGlossMap(p.microsurface,m,s)
	#define MicrosurfaceMerge					MicrosurfaceGlossMapMerge
	#define MicrosurfaceMergeFunction			MicrosurfaceGlossMapMerge
#endif
