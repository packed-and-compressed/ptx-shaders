#include "effect.frag"

vec4 runEffect(LayerState state)
{
	vec4 c = state.layerBacking;
	
	#if defined(LAYER_OUTPUT_SRGB) || defined(LAYER_EMULATE_SRGB) || defined(LAYER_OUTPUT_PERCEPTUAL)
		c.rgb = linearTosRGB(c.rgb);
	#endif

#if LAYER_OUTPUT == CHANNEL_NORMAL
	c.rg = vec2(1.0, 1.0) - c.rg;
#else
	c.rgb = vec3(1.0,1.0,1.0) - c.rgb;
#endif

	#if defined(LAYER_OUTPUT_SRGB) || defined(LAYER_EMULATE_SRGB) || defined(LAYER_OUTPUT_PERCEPTUAL)
		c.rgb = sRGBToLinear(c.rgb);
	#endif
	
	return c;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
