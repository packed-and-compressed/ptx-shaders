#include "effect.frag"
#include "gaussian.sh"

USE_TEXTURE2D( tColorLUT );

vec4 runEffect(LayerState state)
{
	state.result.r = texture2D( tColorLUT, vec2( saturate(state.result.r), 0.5) ).r;
	state.result.g = texture2D( tColorLUT, vec2( saturate(state.result.g), 0.5) ).g;
	state.result.b = texture2D( tColorLUT, vec2( saturate(state.result.b), 0.5) ).b;
	state.result.a = texture2D( tColorLUT, vec2( saturate(state.result.a), 0.5) ).a;
	return state.result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }

