#include "data/shader/common/sharedconstants.sh"
#include "data/shader/mat/state.frag"

uniform uint uShadingComponents;

void	RaytraceMerge( inout FragmentState s )
{
	#ifdef ComponentShading
	{
		bool  useAlbedo            = uShadingComponents & COMPONENT_USEALBEDO;
		float diffuse              = uShadingComponents & COMPONENT_DIFFUSE ? 1.0 : 0.0;
		float reflection           = uShadingComponents & COMPONENT_REFLECTION ? 1.0 : 0.0;
		float emission             = uShadingComponents & COMPONENT_EMISSION ? 1.0 : 0.0;
		float transmissionDiffuse  = uShadingComponents & COMPONENT_TRANSMISSION_DIFFUSE ? 1.0 : 0.0;
		float transmissionSpecular = uShadingComponents & COMPONENT_TRANSMISSION_SPECULAR  ? 1.0 : 0.0;

		s.albedo.rgb      = useAlbedo ? s.albedo.rgb : vec3( 1.0, 1.0, 1.0 );
		s.albedo.rgb     *= diffuse;
		s.sheen          *= diffuse;
		s.reflectivity   *= reflection; s.reflectivitySecondary *= reflection;
		s.fresnel	     *= reflection; s.fresnelSecondary      *= reflection;
		s.emission		 *= emission;
		#ifdef TransmissionIsSpecular
			s.transmissivity *= transmissionSpecular;
		#else
			s.transmissivity *= transmissionDiffuse;
		#endif

		#ifndef ShadowCatcher
			//for non-shadow-catchers set neutral baseColor so that albedo feature is correct ~ms
			s.baseColor    = s.albedo.rgb;
		#endif
	}
	#endif

	//energy conservation weights
	s.diffusion    = saturate( 1.0 - s.metalness ) * saturate( 1.0 - s.transmission );
	s.transmission = saturate( 1.0 - s.metalness ) * s.transmission;

	s.albedo.rgb	  *= s.diffusion;
	s.sheen			  *= s.diffusion;
	s.transmissivity  *= s.transmission;

	#ifdef ShadowCatcher
		//set emission to shadow catcher color so that it's written to radiance buffer on primary hit
		s.emission = s.baseColor;
	#endif

	#ifndef ReflectionSample
		s.gloss = 0.0;
	#endif
	#ifndef ReflectionSampleSecondary
		s.glossSecondary = 0.0;
	#endif
}
#define	Merge	RaytraceMerge
