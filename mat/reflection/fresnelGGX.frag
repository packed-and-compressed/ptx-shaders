#include "data/shader/mat/state.frag"
#include "data/shader/mat/fresnel.frag"

#ifndef FRESNEL_GGX_TEXTURE
#define FRESNEL_GGX_TEXTURE
USE_TEXTURE3D( tFresnelGGX );
#endif

vec3	ReflectionGGXFresnel( in FragmentState fs, float NdotV )
{
	#ifdef SUBROUTINE_SECONDARY
		bool frontFacing = true;
	#else
		bool frontFacing = fs.frontFacing;
	#endif

	// calculate the uv of the 3d texture and read the weighting for coating
	float F = texture3D( tFresnelGGX, fresnelPreconvUVW( frontFacing, _p(fs.gloss), NdotV, _p(fs.eta) ) ).x;
	return mix( _p(fs.reflectivity), vec3(1.0, 1.0, 1.0), F * _p(fs.fresnel) );
}
