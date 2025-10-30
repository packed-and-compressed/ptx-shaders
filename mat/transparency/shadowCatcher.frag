#include "data/shader/common/util.sh"

uniform vec2	uShadowCatcherFadeParams;	// { FadeRadius, FadeFalloff }

void TransparencyShadowCatcherMerge( in MaterialState m, inout FragmentState s )
{
	//write out shadow catcher opacity
	s.albedo.a = m.albedo.a;
	
	//edge fade
	float fadeRadius  = uShadowCatcherFadeParams.x;
	float fadeFalloff = uShadowCatcherFadeParams.y;
	float fadeAlpha   = 1.0;
	if( fadeRadius >= 0.0 )
	{
		vec2  fadeCoords = fadeRadius * (m.vertexTexCoord.uvCoord.xy * 2.0 - 1.0);
		float edgeFade   = saturate( pow( dot(fadeCoords, fadeCoords), fadeFalloff ) );
		fadeAlpha        = 1.0 - edgeFade;
	}

	float alpha = s.albedo.a * fadeAlpha;
	#if !defined( MATERIAL_PASS_PREPASS_HYBRID )
		TransparencyDitherTest( m, s, alpha );
	#endif
	
	#if defined(MATERIAL_PASS_PREPASS_RT) || \
        defined(MATERIAL_PASS_PREPASS_RTAO) || \
		defined(MATERIAL_PASS_PREPASS_HYBRID)
		s.albedo.a = alpha;
	#endif
}

void	TransparencyLightingShadowCatcher( inout FragmentState s )
{
	#if defined(MATERIAL_PASS_LIGHT)
		//shadow ratio
		s.diffuseLight = (s.diffuseLight + 0.5) / (s.generic0.rgb + 0.5);
		//shadow opacity
		s.diffuseLight = mix( vec3(1.0,1.0,1.0), s.diffuseLight, s.albedo.a );
		s.albedo.a = 1.0 - s.diffuseLight.x;
		#ifndef LightMerge_AlphaOut
			#define LightMerge_AlphaOut
		#endif
	#endif	
}

#undef  TransparencyMerge
#undef  TransparencyMergeFunction
#define TransparencyMerge				TransparencyShadowCatcherMerge
#define TransparencyMergeFunction		TransparencyShadowCatcherMerge
#define TransparencyLighting			TransparencyLightingShadowCatcher
#define TransparencyLightingFunction	TransparencyLightingShadowCatcher
