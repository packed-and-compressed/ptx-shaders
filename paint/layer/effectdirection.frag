#include "effect.frag"

#include "gradientmap.frag"
#include "layerinputprocessor.sh"

uniform vec3	uDirection;
USE_PROCESSOR(DIR)

// custom function that gets run per sample by the blur sampler 
// NOTE: currently the blur sampler with a custom function is inlined in this shader because the blur samples themselves need to be decoded (pulled into object space)

vec3 dirSample( vec2 uv, float lod, vec3 tangent, vec3 bitangent, vec3 normal )
{
	vec3 N = vec3(0.0,0.0,0.0);

	#if defined(USE_INPUT_NORMAL_OBJECT)
		N = sampleInputVectorLod( INPUT_NORMAL_OBJECT, uv, lod ).xyz;
		N = normalize(N);

	#elif defined(USE_INPUT_NORMAL) && defined(EFFECT_POSITIONAL)	
		N = sampleInputVectorLod( INPUT_NORMAL, uv, lod ).xyz;
		N = normalize( N.x * tangent + N.y * bitangent + N.z * normal );
	#endif
	return N;
}

float dirFunction( vec3 N )
{
	return dot( N, uDirection ) * 0.5 + 0.5;
}

vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.texCoord;
	float value = 1.0;
	
	ProcessorParams proc = getProcessorParams( DIR );

#if defined(USE_INPUT_NORMAL_OBJECT)
	vec3 sum = blurInputVector( INPUT_NORMAL_OBJECT, sampleCoord, proc ).rgb;
#elif defined(USE_INPUT_NORMAL) && defined(EFFECT_POSITIONAL)
	vec3 sum = blurInputVector( INPUT_NORMAL, sampleCoord, proc ).rgb;
#endif

	#if defined(USE_INPUT_NORMAL_OBJECT)
		sum = normalize( sum );
	#elif defined(USE_INPUT_NORMAL) && defined(EFFECT_POSITIONAL)	
		sum = normalize( sum.x * state.tangent + sum.y * state.bitangent + sum.z * state.normal );
	#endif

	// divide by zero check
	sum /= max(length(sum), 0.00001);
			
	float origin = dirFunction( dirSample( sampleCoord, 0.0,  state.tangent, state.bitangent, state.normal ) );
	value = dirFunction( sum );
	value = processValue( origin, value, proc );
	
	vec4 grade = applyGradientMapGray( value );
	grade.a = 1.0;
	return grade;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{
	return state.result;
}
