//inherits alpha.frag

#include "data/shader/common/rng.comp"

uniform uint   uTransparencyDitherSeed;

void	TransparencyDitherTest( in MaterialState m, in FragmentState s, float alpha )
{
	RNG rng = rngInit( (s.screenCoord.x<<16) | s.screenCoord.y, uTransparencyDitherSeed ^ asuint(s.screenDepth) );
	float noise = rngNextFloat( rng );
	if( alpha <= noise )
	{ discard; }
}

void TransparencyDitherMerge( in MaterialState m, inout FragmentState s )
{
#if !defined(MSET_RAYTRACING) && !defined(MATERIAL_PASS_PAINT) && !defined(MATERIAL_PASS_COLOR_SAMPLE)
    TransparencyDitherTest( m, s, s.albedo.a );
#endif
}

#undef	TransparencyMerge
#undef	TransparencyMergeFunction
#define	TransparencyMerge				TransparencyDitherMerge
#define	TransparencyMergeFunction		TransparencyDitherMerge
