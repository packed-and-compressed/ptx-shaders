#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"
#include "data/shader/scene/raytracing/common.comp"
#include "data/shader/scene/raytracing/bsdf/diffuse.comp"
#include "data/shader/scene/raytracing/bsdf/microfacet.comp"
#include "data/shader/scene/raytracing/bsdf/thinsurface.comp"
#include "data/shader/scene/raytracing/bsdf/regularize.comp"

#ifdef RT_TRANSMISSION_ANISO
#include "data/shader/scene/raytracing/bsdf/anisotropic.comp"
#endif

void	TransmissionThinSurfaceEvaluate( in PathState path, in FragmentState fs, inout SampleState ss )
{	
	evaluateBTDF_ThinDiffuse( ss, fs.transmissivity, fs.thinScatter );

	float roughness = thinRoughness( fs.gloss, fs.eta );
	#if defined(RT_TRANSMISSION_ANISO)
	{
		vec3 basisX, basisY;
		anisoGetBasis( ss.basis, fs.anisoDirection, basisX, basisY );
		vec3 a = anisoRoughnessToA( roughness, fs.anisoAspect );

		if( path.isNonSpecular )
		{ regularizeAnisoGGX( a ); }

		evaluateBTDF_ThinAnisoGGX( ss, fs.transmissivity, a.z, a.x, a.y, basisX, basisY, saturate(1.0 - fs.thinScatter) );
	}
	#else
	{
		float alpha = roughness * roughness;
		
		if( path.isNonSpecular )
		{ regularizeGGX( alpha ); }

		evaluateBTDF_ThinGGX( ss, fs.transmissivity, alpha, saturate(1.0 - fs.thinScatter) );
	}
	#endif
}

void	TransmissionThinSurfaceSample( in PathState path, in FragmentState fs, inout SampleState ss )
{
	if( ss.r.x < fs.thinScatter )
	{
		ss.r.x *= rcp(fs.thinScatter); //reuse random number
		sampleBTDF_Diffuse( ss );
	}
	else
	{
		ss.r.x = ( ss.r.x - fs.thinScatter ) * rcp( 1.0 - fs.thinScatter ); //reuse random number
		float roughness = thinRoughness( fs.gloss, fs.eta );
		#if defined(RT_TRANSMISSION_ANISO)
		{
			vec3 basisX, basisY;
			anisoGetBasis( ss.basis, fs.anisoDirection, basisX, basisY );
			vec3 a = anisoRoughnessToA( roughness, fs.anisoAspect );

			if( path.isNonSpecular )
			{ regularizeAnisoGGX( a ); }

			sampleBRDF_AnisoGGX( ss, a.x, a.y, basisX, basisY );
			ss.flagSpecular = isSpecularGGX( a.z );
			ss.specularity  = saturate( 1.0 - roughness ) * saturate( 1.0 - fs.thinScatter ) * fs.transmission;
		}
		#else
		{
			float alpha = roughness * roughness;
			
			if( path.isNonSpecular )
			{ regularizeGGX( alpha ); }
			
			sampleBRDF_GGX( ss, alpha );
			ss.flagSpecular = isSpecularGGX( alpha );
			ss.specularity  = saturate( 1.0 - roughness ) * saturate( 1.0 - fs.thinScatter ) * fs.transmission;
		}
		#endif

		//reflect L into lower hemisphere
		ss.L = reflectVec( -ss.L, ss.basis.N );
		ss.NdotL = dot( ss.basis.N, ss.L );
	}
}

#if defined(REFLECTION)
	#define TransmissionEvaluate	TransmissionThinSurfaceEvaluate
	#define TransmissionSample		TransmissionThinSurfaceSample
	#define TransmissionThinSurface
	#define TransmissionIsSpecular
#else
	#include "data/shader/mat/transmission/samplePassthrough.frag"
#endif
