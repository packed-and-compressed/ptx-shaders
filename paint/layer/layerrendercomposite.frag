#include "effect.frag"


#ifdef SPARSE_TEXTURE_INPUT
	USE_TEXTURE2DARRAY(tTexture);
	USE_TEXTURE2D(tTexAtlas);
#else
	USE_LAYER_BUFFER2D(tTexture);
#endif

vec4 runEffect(LayerState state)
{
	vec4 result;
#ifdef SPARSE_TEXTURE_INPUT
	vec4 tex;
	sampleSparseTexture( tTexture, tTexAtlas, state.texCoord, tex );
	result = formatBackingColor( uBackingFormat, tex ); 
#else
	result = sampleBackingBuffer( tTexture, state.texCoord );
#endif
	return result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
