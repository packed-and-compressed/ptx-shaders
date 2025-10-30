#include "data/shader/mat/state.frag"

#define TRANSMISSION_FLAG_STRICTNORMALS (1u<<27)
#define TRANSMISSION_FLAG_MASKUSEALBEDO (1u<<28)

struct	TransmissivityBaseParams
{
	uint maskTexture;
	uint scaleBias;
};
void	TransmissivityBase( in TransmissivityBaseParams p, inout MaterialState m, in FragmentState s )
{
	float t = m.albedo.a;
	if( !(p.maskTexture & TRANSMISSION_FLAG_MASKUSEALBEDO) )
	{
		t = textureMaterial( p.maskTexture, m.vertexTexCoord, 1.0 );
		t = scaleAndBias( t, p.scaleBias );
	}
	#if defined(WithStrictNormals)
	{
		m.normalStrict = p.maskTexture & TRANSMISSION_FLAG_STRICTNORMALS;
	}
	#endif
	m.transmission = saturate( t );
}

void	TransmissivityBaseMerge( in MaterialState m, inout FragmentState s )
{
	s.transmission   = m.transmission;
	s.transmissivity = vec3(1.0, 1.0, 1.0);
	s.normalStrict   = m.normalStrict;
}
