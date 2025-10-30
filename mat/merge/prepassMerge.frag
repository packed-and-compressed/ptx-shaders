#include "data/shader/common/sharedconstants.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/fresnel.frag"
#include "data/shader/common/util.sh"

#ifndef USE_OUTPUT1
	#define	USE_OUTPUT1
#endif

#ifndef USE_OUTPUT2
	#define	USE_OUTPUT2
#endif

#ifndef USE_OUTPUT3
	#define	USE_OUTPUT3
#endif

#ifndef USE_OUTPUT4
	#define	USE_OUTPUT4
#endif

uniform uint	uShadingComponents;

void	PrepassMerge( inout FragmentState s )
{
	//normal & misc scalar
#ifdef PrepassOutputNormals
	s.output0.xyz = s.normal;
#else
	s.output0.xyz = vec3( 0, 0, 0 );
#endif
	s.output0.w = s.generic0.x;

	//view space depth
	s.output1.x = s.vertexPosition.z;

	//view space vertex normal (packed to preserve sign)
	s.output2.xyz = s.vertexNormal.xyz * 0.5 + 0.5;
	s.output2.w = 0.0;

	//reflectivity / gloss
#if defined(PrepassOutputReflectivityGloss)
	s.output3 = vec4( 0.0, 0.0, 0.0, s.gloss );
	#if defined( REFLECTION ) || defined( REFLECTION_SECONDARY )
		s.output3.rgb = fresnelSchlick( s.reflectivity, s.fresnel, dot(s.vertexEye,s.normal) );
	#endif
#endif

	//albedo
	s.output4 = vec4( 0.0, 0.0, 0.0, 1.0 );
#if defined( DiffusionWantsPrepassAlbedoOutput ) && !defined( TRANSMISSION ) && defined( PrepassOutputAlbedo )
	bool useAlbedo = uShadingComponents & COMPONENT_USEALBEDO;
	if( !useAlbedo )
	{ s.albedo.rgb = vec3( 1.0, 1.0, 1.0 ); }
	//albedo energy conservation
	s.albedo.rgb *= saturate( 1.0 - s.metalness ) * saturate( 1.0 - s.transmission );
	s.output4.rgb = s.albedo.rgb;
#endif
}

#define	Merge	PrepassMerge
