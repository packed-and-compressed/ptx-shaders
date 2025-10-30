#ifndef MAT_EVALUATE_FRAG
#define MAT_EVALUATE_FRAG

#include "state.frag"
#include "params.frag"
#include "data/shader/scene/raytracing/raydifferential.sh"
#include "data/shader/mat/layerBlend.frag"
#include "data/shader/mat/displacement/layeredParallaxMapPrecompute.frag"

USE_STRUCTUREDBUFFER(MaterialParams, bMaterialParams);

template<bool IsBaseLayer>
MaterialState evaluateMaterialLayer( in MaterialParams params, in RayDifferential rd, inout FragmentState state )
{
	//compute transformed layer UVs from base UVs
    const uint TEX_CHANNEL_FLAG = 0x80000000;
	
    bool useSecondaryUVs	= ( params.texCoordTransform.x & TEX_CHANNEL_FLAG ) >> 31;
    vec4 uvScaleBias		= unpackVec4f( uint2( params.texCoordTransform.x & (~TEX_CHANNEL_FLAG), params.texCoordTransform.y ) );
	vec2 uvRotation			= unpackVec2f( params.texCoordTransform.z );
    vec2 layerTexCoord		= transformUV( useSecondaryUVs ? state.vertexTexCoordSecondary.xy : state.vertexTexCoordBase.xy, uvScaleBias, uvRotation );
	vec2 layerTexGrads		= vec2( 0.0, 0.0 );
	#if defined(Differentials) && defined(DifferentialTexture)
	{
		layerTexGrads = transformTextureGrads( uvScaleBias.xy, uvRotation, useSecondaryUVs ? state.vertexTexCoordSecondary.zw : state.vertexTexCoordBase.zw );
	}
	#endif

	//initialize layer material state
    MaterialState material = newMaterialState();
    material.vertexTexCoord.uvCoord = vec4( layerTexCoord, layerTexGrads );
	InitializeMaterialStateSampleCoords( params, state, material, rd.dP, uvScaleBias, uvRotation );

	// Precompute
    if( IsBaseLayer )
    {
		#ifdef DISPLACEMENT_PARALLAX_LAYERED
	   		DisplacementLayeredParallaxMapPrecompute( params.displacement, params.texCoordTransform, rd.dP, material, state );
		#endif
	}
	
	//evaluate per-layer subroutines
	#ifdef Displacement
		Displacement(params, material, state);
	#endif
	#ifdef Surface
		Surface(params, material, state);
	#endif
	#ifdef Albedo
		Albedo(params, material, state);
	#endif
	#ifdef Microsurface
		Microsurface(params, material, state);
	#endif
	#ifdef Sheen
		Sheen(params, material, state);
	#endif
	#ifdef Glint
		Glint(params, material, state);
	#endif
	#ifdef Reflectivity
		Reflectivity(params, material, state);
	#endif
	#ifdef ReflectionPrecompute
		ReflectionPrecompute(params, material, state);
	#endif
	#ifdef MicrosurfaceSecondary
		MicrosurfaceSecondary(params, material, state);
	#endif
	#ifdef ReflectivitySecondary
		ReflectivitySecondary(params, material, state);
	#endif
	#ifdef ReflectionPrecomputeSecondary
		ReflectionPrecomputeSecondary(params, material, state);
	#endif
	#ifdef Transmissivity
		Transmissivity(params, material, state);
	#endif
	#ifdef Occlusion
		Occlusion(params, material, state);
	#endif
	#ifdef Cavity
		Cavity(params, material, state);
	#endif
	#ifdef Emissive
		Emissive(params, material, state);
	#endif
	#ifdef Transparency
		Transparency(params, material, state);
	#endif

	return material;
}

void	evaluateMaterialMerge( in MaterialState material, inout FragmentState state )
{
	#ifdef DisplacementMerge
		DisplacementMerge(material, state);
	#endif
	#ifdef SurfaceMerge
		SurfaceMerge(material, state);
	#endif	
	#ifdef AlbedoMerge
		AlbedoMerge(material, state);
	#endif
	#ifdef MicrosurfaceMerge
		MicrosurfaceMerge(material, state);
	#endif
	#ifdef SheenMerge
		SheenMerge(material, state);
	#endif
	#ifdef GlintMerge
		GlintMerge(material, state);
	#endif
	#ifdef ReflectivityMerge
		ReflectivityMerge(material, state);
	#endif
	#ifdef ReflectionPrecomputeMerge
		ReflectionPrecomputeMerge(material, state);
	#endif
	#ifdef MicrosurfaceMergeSecondary
		MicrosurfaceMergeSecondary(material, state);
	#endif
	#ifdef ReflectivityMergeSecondary
		ReflectivityMergeSecondary(material, state);
	#endif
	#ifdef ReflectionPrecomputeMergeSecondary
		ReflectionPrecomputeMergeSecondary(material, state);
	#endif
	#ifdef TransmissivityMerge
		TransmissivityMerge(material, state);
	#endif
	#ifdef OcclusionMerge
		OcclusionMerge(material, state);
	#endif
	#ifdef CavityMerge
		CavityMerge(material, state);
	#endif
	#ifdef EmissiveMerge
		EmissiveMerge(material, state);
	#endif
	#ifdef TransparencyMerge
		TransparencyMerge(material, state);
	#endif	
	
	#ifdef DisplacementApply
		DisplacementApply(state);
	#endif
	
	#ifdef Merge
		Merge(state);
	#endif
}

void evaluateMaterial( uint materialIndex, in RayDifferential rd, inout FragmentState state )
{
	#ifdef Premerge
		Premerge(state);
	#endif
	
	//evaluate base layer
	MaterialParams params   = bMaterialParams[materialIndex];
	MaterialState  material = evaluateMaterialLayer<true>( params, rd, state );

	//merge base layer tex coords so we don't have to recompute them again
    state.vertexTexCoord = material.vertexTexCoord;

	//evaluate & composite any additional layers
	#if MATERIAL_LAYER_COUNT > 1
		for( uint layerIndex = 1; layerIndex < MATERIAL_LAYER_COUNT; ++layerIndex )
		{
			MaterialParams layerParams   = bMaterialParams[materialIndex + layerIndex];
			MaterialState  layerMaterial = evaluateMaterialLayer<false>( layerParams, rd, state );
			MaterialComposite( layerParams, state, material, layerMaterial, layerIndex );
		}
	#endif
	
	//merge material state into fragment state
	evaluateMaterialMerge( material, state );
}

void evaluateMaterial( uint materialIndex, inout FragmentState state )
{
	//evaluate with dummy differential for raster, paint renderers that don't use them
	evaluateMaterial( materialIndex, newRayDifferential(), state );
}

#endif
