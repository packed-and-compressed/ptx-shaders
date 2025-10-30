//inherits transmissivityBase

#define SUBSURFACE_FLAG_FUZZMASKWITHGLOSS	(1u<<27)
#define SUBSURFACE_FLAG_USETRANSLUCENCY	    (1u<<28)

uniform uint uSubsurfaceUseScatterColor;

struct TransmissivitySubsurfaceParams
{
	TransmissivityBaseParams base;

	packed_vec4	scatterDepth;
	uint		scatterTexture;
	packed_vec3	fuzzColor;
	uint		fuzzTexture;
};
void	TransmissivitySubsurfaceBase( in TransmissivitySubsurfaceParams p, inout MaterialState m, in FragmentState s )
{
	TransmissivityBase( p.base, m, s );

	m.fuzz          = textureMaterial( p.fuzzTexture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).rgb;
	m.fuzzGlossMask	= p.fuzzTexture & SUBSURFACE_FLAG_FUZZMASKWITHGLOSS;
#if !defined(MATERIAL_PASS_EXPORT)
	m.fuzz         *= p.fuzzColor;
#endif
}

void	TransmissivitySubsurfaceBaseMerge( in MaterialState m, inout FragmentState s )
{
	TransmissivityBaseMerge( m, s );

	s.fuzz          = m.fuzz;
	s.fuzzGlossMask = m.fuzzGlossMask;
}
