#include "data/shader/mat/state.frag"

#define EMISSIVE_FLAG_UNDERCOAT (1u<<28)

uniform float uFluorescentSphere[9];

struct	EmissiveFluorescentParams
{
	uint		texture;
	packed_vec3 color;
};
void	EmissiveFluorescent( in EmissiveFluorescentParams p, inout MaterialState m, in FragmentState s )
{
	vec3 fluorescentMap = textureMaterial( p.texture, m.vertexTexCoord, vec4(1.0,1.0,1.0,0.0) ).xyz;
    m.emission = p.color * fluorescentMap;
    m.emissionUnderCoat = p.texture & EMISSIVE_FLAG_UNDERCOAT;
}

void EmissiveFluorescentMerge( in MaterialState m, inout FragmentState s )
{
    float e = uFluorescentSphere[0];

    e += uFluorescentSphere[1] * s.normal.y;
    e += uFluorescentSphere[2] * s.normal.z;
    e += uFluorescentSphere[3] * s.normal.x;

    vec3 swz = s.normal.yyz * s.normal.xzx;
    e += uFluorescentSphere[4] * swz.x;
    e += uFluorescentSphere[5] * swz.y;
    e += uFluorescentSphere[7] * swz.z;

    vec3 sqr = s.normal * s.normal;
    e += uFluorescentSphere[6] * ( 3.0 * sqr.z - 1.0 );
    e += uFluorescentSphere[8] * ( sqr.x - sqr.y );

    s.emission = m.emission * e;
    s.emissionUnderCoat = m.emissionUnderCoat;
}

#define EmissiveParams		    EmissiveFluorescentParams
#define Emissive(p,m,s)		    EmissiveFluorescent(p.emissive,m,s)
#define EmissiveMerge		    EmissiveFluorescentMerge
#define EmissiveMergeFunction	EmissiveFluorescentMerge
