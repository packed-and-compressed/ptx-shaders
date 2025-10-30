#include "data/shader/mat/state.frag"
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"

void    ReflectionAnisotropicExport( inout FragmentState s )
{
	vec3 basisX, basisY;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	anisoGetBasis( s, s.vertexTexCoord.projectorToShadingRotation, _p(s.anisoDirection), basisX, basisY );
#else
	anisoGetBasis( s, _p(s.anisoDirection), basisX, basisY );
#endif
    s.generic3.xyz = basisX;
}

#define Reflection          ReflectionAnisotropicExport
