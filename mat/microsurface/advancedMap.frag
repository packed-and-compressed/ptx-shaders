#include "data/shader/mat/state.frag"

struct	MicrosurfaceAdvancedMapParams
{
	uint	texture;
	uint	scaleBias;
	float	exponent;
	float	horizonSmooth;
};
void	MicrosurfaceAdvancedMap( in MicrosurfaceAdvancedMapParams p, inout MaterialState m, in FragmentState s )
{
	float g = textureMaterial( p.texture, m.vertexTexCoord, 1.0 );
	g = pow( g, p.exponent );
    _p( m.glossOrRoughness ) = scaleAndBias( g, p.scaleBias );

    m.horizonSmoothing = p.horizonSmooth;
}

void MicrosurfaceAdvancedMapMerge( in MaterialState m, inout FragmentState s )
{
    float glossOrRoughness = _p( m.glossOrRoughness );
    _p( s.gloss ) = _p( m.glossFromRoughness ) ? saturate( 1.0 - glossOrRoughness ) : glossOrRoughness;
	
	// https://marmosetco.tumblr.com/post/81245981087
    float h = saturate( dot( s.normal, s.vertexEye ) );
    h = m.horizonSmoothing - h * m.horizonSmoothing;
    _p( s.gloss ) = mix( _p( s.gloss ), 1.0, h * h );
}

#ifdef SUBROUTINE_SECONDARY
	#define MicrosurfaceParamsSecondary			MicrosurfaceAdvancedMapParamsSecondary
	#define	MicrosurfaceSecondary(p,m,s)		MicrosurfaceAdvancedMapSecondary(p.microsurfaceSecondary,m,s)
	#define MicrosurfaceMergeSecondary			MicrosurfaceAdvancedMapMergeSecondary
	#define MicrosurfaceMergeFunctionSecondary	MicrosurfaceAdvancedMapMergeSecondary
#else
	#define MicrosurfaceParams					MicrosurfaceAdvancedMapParams
	#define	Microsurface(p,m,s)					MicrosurfaceAdvancedMap(p.microsurface,m,s)
	#define MicrosurfaceMerge					MicrosurfaceAdvancedMapMerge
	#define MicrosurfaceMergeFunction			MicrosurfaceAdvancedMapMerge
#endif
