#include "data/shader/common/packed.sh"

#include "paramsParallaxMap.frag"

void	DisplacementParallaxMap( in DisplacementParallaxMapParams p, in uvec3 texCoordTransform, inout MaterialState m, inout FragmentState s )
{
	vec2 depthOffset = vec2( f16tof32( p.depthOffset ), f16tof32( p.depthOffset >> 16 ) );

	vec3 dir = vec3(	dot( -s.vertexEye, s.vertexTangent ),
						dot( -s.vertexEye, s.vertexBitangent ),
						dot( -s.vertexEye, s.vertexNormal ) );
	vec2 maxOffset = dir.xy * ( depthOffset.x / ( abs( dir.z ) + 0.001 ) );

	vec2 uvRotation = unpackVec2f( texCoordTransform.z );
	maxOffset = vec2( maxOffset.x * uvRotation.x - maxOffset.y * uvRotation.y,
						maxOffset.x * uvRotation.y + maxOffset.y * uvRotation.x );

	#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
		m.vertexTexCoord.projectorCoord.uvX.xy += ( s.displacement.y - depthOffset.y ) * maxOffset;
		m.vertexTexCoord.projectorCoord.uvY.xy += ( s.displacement.y - depthOffset.y ) * maxOffset;
		m.vertexTexCoord.projectorCoord.uvZ.xy += ( s.displacement.y - depthOffset.y ) * maxOffset;
	#endif

	m.vertexTexCoord.uvCoord.xy += ( s.displacement.x - depthOffset.y ) * maxOffset;	
}

void	DisplacemenParallaxMapMerge( in MaterialState m, inout FragmentState s )
{
	// NOOP
}

#define Displacement(p,m,s)			DisplacementParallaxMap(p.displacement,p.texCoordTransform,m,s)
#define DisplacementMerge			DisplacemenParallaxMapMerge
#define DisplacementApply(s)
