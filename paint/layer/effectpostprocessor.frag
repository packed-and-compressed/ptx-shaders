#include "effect.frag"
#include "layerinputprocessor.sh"

USE_TEXTURE2D( tProcessorTexture );

USE_PROCESSOR()

vec4 runEffect(LayerState state)
{	
	ProcessorParams proc = getProcessorParams();
	vec4 sum = blurLayerBuffer( state.texCoord, proc );
	vec4 origin = texture2DLod( tProcessorTexture, state.texCoord, 0 );

	vec4 result = vec4( 0.0, 0.0, 0.0, 1.0 );
	result.rgb = processColor( origin, sum, proc ).rgb;

	return result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }