#include "effect.frag"
#include "gradientmap.frag"
#include "layerinputprocessor.sh"

USE_PROCESSOR(AO)

vec4 runEffect(LayerState state)
{
	ProcessorParams proc = getProcessorParams( AO );
	state.result = processInputGray( INPUT_AO, state.bufferCoord, proc );
	state.result.rgb = applyGradientMapGray( state.result.r ).rgb;
	return state.result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
