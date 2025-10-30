#include "effect.frag"
#include "gradientmap.frag"
#include "layerinputprocessor.sh"

USE_PROCESSOR( HEIGHT )

vec4 runEffect(LayerState state)
{	
	ProcessorParams proc = getProcessorParams( HEIGHT );	
	state.result = processInputGray( INPUT_HEIGHT, state.bufferCoord, proc );
	state.result.rgb = applyGradientMapGray( state.result.r ).rgb;
	return state.result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
