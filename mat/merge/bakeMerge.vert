#include "../state.vert"

uniform vec4	uLayoutScaleBias;

void	BakeMerge( inout VertexState s )
{
	//for baking, raster position is texcoord value
	s.rasterPosition.xy = uLayoutScaleBias.xy * s.texCoord.uvCoord.xy + uLayoutScaleBias.zw;
	s.rasterPosition.zw = vec2(0,1);
}

#define	Merge	BakeMerge