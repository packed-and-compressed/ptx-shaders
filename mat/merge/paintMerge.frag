#include "data/shader/paint/layer/materialsurface.frag"
#include "data/shader/mat/state.frag"
#include "data/shader/paint/layer/layer.sh"
#include "data/shader/common/projector.sh"

uniform float		uUseMetalWorkflow;	// 1.0 if using metalness workflow for albedo

#ifdef EFFECT_POSITIONAL	
	uniform mat4	uModelView;
	uniform mat4	uModelViewIT;
	uniform vec4	uScaleBias;
#endif

void	_initFragmentState( inout FragmentState s )
{
	//state defaults
	s.displacement = vec3( 0.5, 0.5, 0.5 );
	s.albedo = vec4(1.0,1.0,1.0,1.0);
	s.baseColor = s.albedo.rgb;
	s.normal = vec3(0.5,0.5,1.0);
	s.gloss = 0.7;
	s.reflectivity = vec3(0.04, 0.04, 0.04);
	s.sheen = vec3(0.0,0.0,0.0);
	s.sheenRoughness = 0.5;
	s.fuzz = vec3(0.0,0.0,0.0);
	s.transmissivity = vec3(1.0,1.0,1.0);
	s.metalness = 0.0;
	s.occlusion = 1.0;
	s.cavity = 1.0;
	s.scatterColor = vec3(0.0,0.0,0.0);
	s.refractionColor = vec3(1.0,1.0,1.0);
    s.emission = vec3( 0.0, 0.0, 0.0 );
	s.anisoTangent = vec3(0.0,1.0,0.0);

	s.glintUV = vec2(0.0, 0.0);
	s.glintPackedData = half3(0.0, 0.0, 0.0);
	s.glintEWACoeff = vec3(0.0, 0.0, 0.0 );
	s.glintIntensity = 0.0;
	s.glintRoughness = 0.0;
	s.glintS = int2(0, 0);
	s.glintT = int2(0, 0);
	s.glintWeight = half(1.0);
	s.glintLOD = 0;
	s.glintSettings = vec4( 0, 0, 0, 0 );
	s.glintUseMicrofacet = false;
}

void	PaintPremerge( inout FragmentState s )
{
	_initFragmentState( s );
}
#define Premerge PaintPremerge

void	PaintMerge( inout FragmentState s )
{
	#ifndef LAYER_OUTPUT
		#define	LAYER_OUTPUT 0
	#endif

	vec4 o = vec4(1.0,1.0,1.0,1.0);

	#if LAYER_OUTPUT == CHANNEL_NORMAL		
		o.rgb = s.normal.rgb;	//texture matrix inverse mult happens in finalizeEffect
	#elif LAYER_OUTPUT == CHANNEL_ALBEDO		
		o.rgb = mix( s.albedo.rgb * (1.0-s.metalness), s.baseColor, uUseMetalWorkflow );
	
	#elif LAYER_OUTPUT == CHANNEL_SPECULAR
		o.rgb = s.reflectivity;
			
	#elif LAYER_OUTPUT == CHANNEL_GLOSS
		o.r = o.g = o.b = s.gloss;

	#elif LAYER_OUTPUT == CHANNEL_ROUGHNESS
		o.r = o.g = o.b = 1.0 - s.gloss;

	#elif LAYER_OUTPUT == CHANNEL_METALNESS
		o.r = o.g = o.b = s.metalness;

	#elif LAYER_OUTPUT == CHANNEL_OCCLUSION
		o.r = o.g = o.b = s.occlusion;

	#elif LAYER_OUTPUT == CHANNEL_CAVITY
		o.r = o.g = o.b = s.cavity;

	#elif LAYER_OUTPUT == CHANNEL_OPACITY
		o.r = o.g = o.b = s.albedo.a;

	#elif LAYER_OUTPUT == CHANNEL_DISPLACEMENT
		o.rgb = s.displacement;

	#elif LAYER_OUTPUT == CHANNEL_BUMP
		o.r = o.g = o.b = .5;

	#elif LAYER_OUTPUT == CHANNEL_EMISSIVE
		o.rgb = s.emission;
		
	#elif LAYER_OUTPUT == CHANNEL_SCATTER
		o.rgb = s.scatterColor;
	
	#elif LAYER_OUTPUT == CHANNEL_REFRACTION_DEPTH
		o.rgb = s.refractionColor;

	#elif LAYER_OUTPUT == CHANNEL_TRANSMISSION_MASK
		o.rgb = s.transmissivity;

	#elif LAYER_OUTPUT == CHANNEL_ANISO_DIR
		o.rgb = s.anisoTangent * 0.5 + vec3(0.5,0.5,0.5);

	#elif LAYER_OUTPUT == CHANNEL_FUZZ
		o.rgb = s.fuzz;

	#elif LAYER_OUTPUT == CHANNEL_SHEEN
		o.rgb = s.sheen;

	#elif LAYER_OUTPUT == CHANNEL_SHEEN_ROUGHNESS
		o.rgb = s.sheenRoughness;

	#elif LAYER_OUTPUT == CHANNEL_GLINT
		o.rgb = s.glintIntensity;

	#elif LAYER_OUTPUT == CHANNEL_GLINT_ROUGHNESS
		o.rgb = s.glintRoughness;
	#endif
	
	// material fill does not write alpha for various reasons including bc7 compression artifacts. --Andres
	o.a = 1.0;

	s.output0 = o;		
}
#define Merge	PaintMerge

