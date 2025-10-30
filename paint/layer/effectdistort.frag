
#include "gaussian.sh"
#include "layernoise.sh"
#include "layer.sh"
#include "surfacecrawler.sh"
#include "effect.frag"

#include "effectperlinbase.frag"
#include "effectwarpcoords.frag"

uniform float uColorScale;

//USE_TEXTURE2D( tTexture );

vec2 getSeamless3DWarpUV( LayerState state )
{
	PaddedPixelDesc originDesc = getPaddedPixelDesc(state.texCoord);
	vec3 warpOffset = applyWarp3D(state.worldPosition, 1) - state.worldPosition;
	SurfaceCrawlResultV crawl = crawlSurface( state.worldPosition, state.normal, warpOffset, originDesc.triangleIndex );
	return crawl.uvActual;
}

vec4 runEffect(LayerState state)
{
	PaddedPixelDesc originDesc = getPaddedPixelDesc(state.texCoord);
	if( originDesc.sdf < 0 )
	{
		return vec4(1,0,0,1);
		//return vec4(abs(originDesc.sdf)*uColorScale,0,0,1);
	}
	if( originDesc.mapIndex > 0 )
	{
		return vec4(originDesc.sdf*uColorScale,originDesc.sdf*uColorScale,0,1);
	}
	return vec4(originDesc.sdf*uColorScale,0,originDesc.sdf*uColorScale,1);
	//return texture2DLod( tTexture, getSeamless3DWarpUV( state ), 0.0 );
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{
	//state.result = sampleBackingBuffer(tLayerBacking, state.texCoord);
	vec4 outputColor = state.result;
	outputColor.rgb = 0.5 * state.position.xyz + vec3(0.5,0.5,0.5);
	return outputColor;

}
