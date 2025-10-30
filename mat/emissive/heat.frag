#include "data/shader/mat/state.frag"

#define EMISSIVE_FLAG_UNDERCOAT (1u<<28)

USE_TEXTURE2D(tEmissiveHeatSpectrum);

struct  EmissiveHeatParams
{
	uint		texture;
	packed_vec3	heatRange;
};
void    EmissiveHeat( in EmissiveHeatParams p, inout MaterialState m, in FragmentState s )
{
	float heatMap = textureMaterial( p.texture, m.vertexTexCoord, 1.0 );
	float temp = mix( p.heatRange.x, p.heatRange.y, heatMap );
	float mireds = 1000.0 / temp; //actually mireds divided by 1000
	
	float intensity = saturate( temp/ 10000.0 );
	intensity *= intensity;
	intensity *= p.heatRange.z;

	m.emission = intensity * texture2D( tEmissiveHeatSpectrum, vec2(mireds,0.0) ).rgb;
	m.emissionUnderCoat = p.texture & EMISSIVE_FLAG_UNDERCOAT;
}

void EmissiveHeatMerge( in MaterialState m, inout FragmentState s )
{
    s.emission = m.emission;
	s.emissionUnderCoat = m.emissionUnderCoat;
}

#define EmissiveParams			EmissiveHeatParams
#define	Emissive(p,m,s)			EmissiveHeat(p.emissive,m,s)
#define EmissiveMerge			EmissiveHeatMerge
#define EmissiveMergeFunction	EmissiveHeatMerge