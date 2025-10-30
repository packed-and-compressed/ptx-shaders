#include "layer.sh"

#ifdef USE_SOLID_COLOR
	uniform vec4 uColor;
#else
	USE_LAYER_BUFFER2D(tTexture);
#endif

vec3 checker( vec2 tc, const float scale, const float bias )
{
	const float period = 3.1415962 * 4.0;
	vec2 osc = vec2( sin(tc.x*period), sin(tc.y*period) );
	osc = clamp( 1000.0 * osc, vec2(-1.0,-1.0), vec2(1.0, 1.0) );
	float c = bias + scale * osc.x * osc.y;
	return vec3(c,c,c);	
}

BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	LayerState state = getLayerState( fBufferCoord );	
#ifdef USE_SOLID_COLOR
	vec4 input = uColor;
#else
	vec4 input = sampleBackingBufferRawLod( tTexture, state.texCoord, 0.0 );
#endif
	state.result = formatBackingColor( uBackingFormat, input );
	state.result = formatOutputColor( uOutputFormat, state.result );	
#ifdef USE_LINEAR_PREVIEW_GAMMA
	state.result.rgb = sRGBToLinear(state.result.rgb);
#endif
	state.result.rgb = mix( checker(fBufferCoord, 0.05, 0.2), state.result.rgb, state.result.a );
	state.result.a = 1.0;
	OUT_COLOR0 = state.result;
}

