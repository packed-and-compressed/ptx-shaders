#include "effect.frag"

uniform vec4 uColor;


vec4 runEffect(LayerState state)
{	
	return formatBackingColor( uBackingFormat, uColor );
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
