#define NO_DITHER  //don't dither the result!
#include "effect.frag"
#include "gaussian.sh"

USE_LAYER_BUFFER2D( tTexture );
uniform float uRadius;
uniform float uLOD;
uniform float uAmount;

vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.bufferCoord;

	//hex aspects
	const vec2 aspect_r = vec2(uRadius, uRadius); 	
	const vec2 aspect_h = 0.866 * aspect_r;
	
	const vec2 hexagon[] = {
		vec2( 1.0, 0.0 ),
		vec2( 0.5, 0.866 ),
		vec2(-0.5, 0.866 ),
		vec2(-1.0, 0.0 ),
		vec2(-0.5,-0.866 ),
		vec2( 0.5,-0.866 ),
	};

	vec4 origin = state.layerBacking;
	vec4 sum = vec4(0.0,0.0,0.0,0.0);
	vec4 sum_w = vec4(0.0,0.0,0.0,0.0);
	
	//outer hexel	
	{
		HINT_UNROLL
		for( int i=0; i<6; ++i )
		{
			vec2 uv_d = aspect_r * hexagon[i];
			vec4 texel = sampleBackingBufferLod( tTexture, sampleCoord + uv_d, uLOD );
			texel.rgb *= texel.a;
			sum += texel;
		}	
		sum_w += 6.0;
	}
	//off-kilter hexel	
	{
		HINT_UNROLL
		for( int i=0; i<6; ++i )			
		{
			vec2 uv_d = aspect_r * hexagon[i].yx;
			vec4 texel = sampleBackingBufferLod( tTexture, sampleCoord + uv_d, uLOD );
			texel.rgb *= texel.a;
			sum += texel;
		}
		sum_w += 6.0;
	}
	sum /= sum_w;
	sum.rgb /= max(0.001, sum.a);
	sum = saturate( sum );
	
	vec4 sharp = saturate( origin + (origin - sum) * uAmount );
	return sharp;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
