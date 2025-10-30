#include "data/shader/mat/state.vert"

#define VERT_NOATTRIBS

void	ExportPremerge( inout VertexState s )
{
	s.position.z = 0.5;
	if( s.vertexID == 0 )
	{
		s.position.xy = vec2(-1.0,-1.0);
		s.texCoord.uvCoord.xy = vec2(0.0,0.0);
	}
	else if( s.vertexID == 1 )
	{
		s.position.xy = vec2(3.0,-1.0);
		s.texCoord.uvCoord.xy = vec2(2.0,0.0);
	}
	else
	{
		s.position.xy = vec2(-1.0,3.0);
		s.texCoord.uvCoord.xy = vec2(0.0,2.0);
	}
	s.texCoord.uvCoord.zw = s.texCoord.uvCoord.xy;
}

#define Premerge ExportPremerge
