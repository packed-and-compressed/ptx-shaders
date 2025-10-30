#ifndef MSET_V2_PARAMS_FRAG
#define MSET_V2_PARAMS_FRAG

#include "data/shader/common/packed.sh"

struct MaterialParams
{
#if MATERIAL_LAYER_COUNT > 1
	packed_uvec2	blendOperators;
#endif
    packed_uvec3	texCoordTransform;	//TextureParams base
#ifdef TextureParams
	TextureParams	texture;
#endif
#ifdef CompositorParams
	CompositorParams compositor;
#endif
#ifdef DisplacementParams
	DisplacementParams displacement;
#endif
#ifdef SurfaceParams
	SurfaceParams surface;
#endif
#ifdef AlbedoParams
	AlbedoParams albedo;
#endif
#ifdef SheenParams
	SheenParams sheen;
#endif
#ifdef TransmissivityParams
	TransmissivityParams transmissivity;
#endif
#ifdef MediumParams
	MediumParams medium;
#endif
#ifdef GlintParams
	GlintParams glint;
#endif
#ifdef ReflectionParams
	ReflectionParams reflection;
#endif
#ifdef MicrosurfaceParams
	MicrosurfaceParams microsurface;
#endif
#ifdef ReflectivityParams
	ReflectivityParams reflectivity;
#endif
#ifdef ReflectionParamsSecondary
	ReflectionParamsSecondary reflectionSecondary;
#endif
#ifdef MicrosurfaceParamsSecondary
	MicrosurfaceParamsSecondary microsurfaceSecondary;
#endif
#ifdef ReflectivityParamsSecondary
	ReflectivityParamsSecondary reflectivitySecondary;
#endif
#ifdef EmissiveParams
	EmissiveParams emissive;
#endif
#ifdef OcclusionParams
	OcclusionParams occlusion;
#endif
#ifdef TransparencyParams
	TransparencyParams transparency;
#endif
};

#ifdef MATERIAL_DEBUG
	uniform uint uMaterialParamsSize;
	#ifdef SHADER_PIXEL
		#define MATERIAL_DEBUG_CHECK_PARAMS() \
			if( sizeof( MaterialParams ) != uMaterialParamsSize ) { discard; return; }
	#else
		#define MATERIAL_DEBUG_CHECK_PARAMS() \
			if( sizeof( MaterialParams ) != uMaterialParamsSize ) { return; }
	#endif
#else
	#define MATERIAL_DEBUG_CHECK_PARAMS()
#endif

#endif
