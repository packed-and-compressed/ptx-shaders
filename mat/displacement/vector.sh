#include "data/shader/mat/state.frag"

#define DISPLACEMENT_VECTOR_MAP_FLAG_TANGENT_SPACE	(1u<<0)

struct  DisplacementVectorParams
{
	uint			texture;
	packed_vec3		scale;
	packed_vec3		bias;
	float			meshScale;
	uint			flags;
};
void DisplacementVector( in DisplacementVectorParams p, inout MaterialState m, in FragmentState s )
{
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	vec4 dispX = textureMaterial( p.texture, m.vertexTexCoord.projectorCoord.uvX, vec4(0.0, 0.0, 0.0, 0.0) );
	vec4 dispY = textureMaterial( p.texture, m.vertexTexCoord.projectorCoord.uvY, vec4(0.0, 0.0, 0.0, 0.0) );
	vec4 dispZ = textureMaterial( p.texture, m.vertexTexCoord.projectorCoord.uvZ, vec4(0.0, 0.0, 0.0, 0.0) );

	HINT_FLATTEN
	if( p.flags & DISPLACEMENT_VECTOR_MAP_FLAG_TANGENT_SPACE )
	{
		projectTaps( dispX, dispY, dispZ, m.vertexTexCoord.projectorCoord );
	}

	vec3 disp = triplanarCarefulMix( m.vertexTexCoord.projectorCoord, dispX, dispY, dispZ ).xyz;
	disp = mulVec( m.vertexTexCoord.projectorToShadingRotation, disp );
#else
    vec3 disp = textureMaterial( p.texture, m.vertexTexCoord.uvCoord, vec4( 0.0, 0.0, 0.0, 0.0 ) ).xyz;

	HINT_FLATTEN
	if( p.flags & DISPLACEMENT_VECTOR_MAP_FLAG_TANGENT_SPACE )
	{
		disp = (disp.x * normalize(s.vertexTangent)) + disp.y * (normalize(s.vertexBitangent)) + (disp.z * normalize(s.vertexNormal));
	}
#endif
	m.displacement = p.scale * disp + p.bias;
    m.displacementMeshScaleBias = vec2( p.meshScale, 1.0 );
}

void	DisplacementVectorMerge( in MaterialState m, inout FragmentState s )
{
    s.displacement = m.displacementMeshScaleBias.x * m.displacement;
}

void	DisplacementVectorApply( inout FragmentState s )
{
	s.vertexPosition = s.vertexPosition + s.displacement;
}

#define DisplacementParams		DisplacementVectorParams
#define	Displacement(p,m,s)		DisplacementVector(p.displacement,m,s)
#define	DisplacementMerge		DisplacementVectorMerge
#define	DisplacementApply		DisplacementVectorApply