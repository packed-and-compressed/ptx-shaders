#include "layer.sh"

BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 sampleCoord = fBufferCoord;
	LayerState state = getLayerState( sampleCoord );

	#if defined(USE_INPUT_AO)
		state.result = sampleInputGray( INPUT_AO, sampleCoord );
	
	#elif defined(USE_INPUT_CURVATURE)
		state.result = sampleInputGray( INPUT_CURVATURE, sampleCoord );
	
	#elif defined(USE_INPUT_THICKNESS)
		state.result = sampleInputGray( INPUT_THICKNESS, sampleCoord );
		
	#elif defined(USE_INPUT_NORMAL)
		state.result = sampleInputVector( INPUT_NORMAL, sampleCoord );
		// NOTE: vector blend functions in compositeLayerState expect a right-handed, [0,1] normal
		// Decode takes us to right-handed [-1,1], and then we scale/bias it again.
		state.result = (state.result * vec4(0.5,0.5,0.5,1.0)) + vec4(0.5,0.5,0.5,0.0);
		
	#elif defined(USE_INPUT_NORMAL_OBJECT)
		state.result = sampleInputVector( INPUT_NORMAL_OBJECT, sampleCoord );
		
		// See note above.
		state.result = (state.result * vec4(0.5,0.5,0.5,1.0)) + vec4(0.5,0.5,0.5,0.0);
	
	#elif defined(USE_INPUT_CAVITY)
		state.result = sampleInputGray( INPUT_CAVITY, sampleCoord );
	
	#elif defined(USE_INPUT_HEIGHT)
		state.result = sampleInputGray( INPUT_HEIGHT, sampleCoord );
	
	#elif defined(USE_INPUT_BUMP)
		state.result = sampleInputGray( INPUT_BUMP, sampleCoord );

	#else
		state.result = vec4(0.0, 0.0, 0.0, 0.0);
	#endif

	state.result = compositeLayerState( state );
	OUT_COLOR0 = state.result;
}

