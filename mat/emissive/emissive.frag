#include "data/shader/mat/state.frag"

#define EMISSIVE_FLAG_UNDERCOAT (1u<<28)

struct  EmissiveMapParams
{
	uint		texture;
	packed_vec3	emission;
	packed_vec3	color;
};
void    EmissiveMap( in EmissiveMapParams p, inout MaterialState m, in FragmentState s )
{
	vec3 emissiveMap = textureMaterial( p.texture, m.vertexTexCoord, vec4(0.0, 0.0, 0.0, 0.0) ).xyz;	
    m.emission = p.emission + emissiveMap * p.color.rgb;
	m.emissionUnderCoat = p.texture & EMISSIVE_FLAG_UNDERCOAT;
}

void EmissiveMapMerge( in MaterialState m, inout FragmentState s )
{
    s.emission = m.emission;
	s.emissionUnderCoat = m.emissionUnderCoat;
}

#define EmissiveParams			EmissiveMapParams
#define	Emissive(p,m,s)			EmissiveMap(p.emissive,m,s)
#define EmissiveMerge			EmissiveMapMerge
#define EmissiveMergeFunction	EmissiveMapMerge
