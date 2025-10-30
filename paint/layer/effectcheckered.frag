#define NO_DITHER			//don't dither this effect!
#include "effect.frag"
#include "gaussian.sh"
#include "layernoise.sh"
#include "effectperlinbase.frag"
#include "effectwarpcoords.frag"

#ifndef PREPASS
	#include "data/shader/common/projector.sh"
	#include "layer.sh"
#endif

uniform float	uContrast;
uniform float	uScale;
uniform vec4	uColorA;
uniform vec4	uColorB;


vec4 getCheckerBoard(vec2 uv)
{
	int cb = floor(uv.x)+floor(uv.y);
	float h = cb;
	h *= 0.5;
	if( h != floor(h) )
	{ return uColorA; }
	return uColorB;
}

vec4 getCheckerBoard3D(vec3 pos)
{
	int cb = floor(pos.x)+floor(pos.y)+floor(pos.z);
	float h = cb;
	h *= 0.5;
	if( h != floor(h) )
	{ return uColorA; }
	return uColorB;
}

vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.texCoord;

	vec4 outputColor = vec4(0.0,0.0,0.0,0.0);

	#ifdef EFFECT_POSITIONAL
		#ifdef EFFECT_TRIPLANAR
			outputColor = getCheckerBoard( applyWarp(state.texCoord, uScale) * uScale );
		#else
			outputColor = getCheckerBoard3D(applyWarp3D(state.position, uScale) * uScale);
		#endif
	#else
		outputColor = getCheckerBoard(applyTiledWarp(state.texCoord.xy, state.texCoord.xy, vec2(0, 0), uScale) * uScale);
	#endif

	outputColor = lerp( vec4(0.5,0.5,0.5,1.0), outputColor, uContrast );		//amount is noise contrast, i.e. lerp between flat gray and noise

	return outputColor;		
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
