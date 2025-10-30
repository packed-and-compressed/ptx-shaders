#include "data/shader/mat/state.frag"

struct TransparencyAlphaParams
{
    uint texture;
    float alpha;
};

float TransparencyAlphaOpacity( in TransparencyAlphaParams p, in SampleCoord tc, in float opacity )
{
    bool useAlbedoAlpha = p.alpha < 0.0;
    float result = useAlbedoAlpha ? opacity * abs( p.alpha ) : p.alpha;
    return result * textureMaterial( p.texture, tc, 1.0 );
}

void	TransparencyAlpha( in TransparencyAlphaParams p, inout MaterialState m, in FragmentState s )
{
    m.albedo.a = TransparencyAlphaOpacity( p, m.vertexTexCoord, m.albedo.a );
}

void	TransparencyAlphaMerge( in MaterialState m, inout FragmentState s )
{
	s.albedo.a = m.albedo.a;
}

#define TransparencyParams				TransparencyAlphaParams
#define Transparency(p,m,s)				TransparencyAlpha(p.transparency,m,s)
#define TransparencyOpacity(p,tc,o)     TransparencyAlphaOpacity(p.transparency,tc,o)

//if no albedo subroutine is present provide a merge function to write-out alpha
#ifndef AlbedoMerge
#define AlbedoMerge						TransparencyAlphaMerge
#define AlbedoMergeFunction				TransparencyAlphaMerge
#endif
