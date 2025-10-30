#include "data/shader/common/sharedconstants.sh"
#include "data/shader/common/util.sh"
#include "data/shader/common/const.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/light.frag"

#if defined(IndirectLightingMask)
	#define USE_OUTPUT1
#endif

uniform uint uShadingComponents;

void	LightMerge( inout FragmentState s )
{
	bool useAlbedo = uShadingComponents & COMPONENT_USEALBEDO;
	s.albedo.rgb   = useAlbedo ? s.albedo.rgb : vec3( 1.0, 1.0, 1.0 );

	//energy conservation weights
	s.diffusion    = saturate( 1.0 - s.metalness ) * saturate( 1.0 - s.transmission );
	s.transmission = saturate( 1.0 - s.metalness ) * s.transmission;

	s.albedo.rgb	  *= s.diffusion;
	s.sheen			  *= s.diffusion;
	s.transmissivity  *= s.transmission;
}

void	LightOutput( inout FragmentState s )
{
	float diffuse              = uShadingComponents & COMPONENT_DIFFUSE ? 1.0 : 0.0;
	float reflection           = uShadingComponents & COMPONENT_REFLECTION ? 1.0 : 0.0;
	float emission             = uShadingComponents & COMPONENT_EMISSION ? 1.0 : 0.0;
	float transmissionDiffuse  = uShadingComponents & COMPONENT_TRANSMISSION_DIFFUSE ? 1.0 : 0.0;
	float transmissionSpecular = uShadingComponents & COMPONENT_TRANSMISSION_SPECULAR  ? 1.0 : 0.0;
	
	s.diffuseLight  = clamp( s.diffuseLight,  0.0, FLT_MAX ) * diffuse;
	s.specularLight = clamp( s.specularLight, 0.0, FLT_MAX ) * reflection;
    s.emission		= clamp( s.emission, 0.0, FLT_MAX ) * emission;
	
	s.output0.rgb   = min( s.diffuseLight + s.specularLight + s.emission, FLT_MAX );
	#if defined(LightMerge_AlphaOut)
		s.output0.a = s.albedo.a;
	#else
		s.output0.a = 1.0;
	#endif

	#if defined(IndirectLightingMask)
		#ifdef TransmissionIsSpecular
			s.output1.rg = vec2( 0.0, s.transmission * transmissionSpecular );
		#else
			s.output1.rg = vec2( s.transmission * transmissionDiffuse, 0.0 );
		#endif
	#endif
}

#define	Merge		LightMerge
#define Output 		LightOutput
