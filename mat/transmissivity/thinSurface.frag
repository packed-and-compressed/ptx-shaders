//inherits transmissivityBase

#define THINSURFACE_FLAG_USEALBEDO	(1u<<27)

struct	TransmissivityThinSurfaceParams
{
	TransmissivityBaseParams base;

	packed_vec3	translucencyColor;
	uint		translucencyTexture;
	float		translucencyScatter;
};
void	TransmissivityThinSurface( in TransmissivityThinSurfaceParams p, inout MaterialState m, in FragmentState s )
{
	TransmissivityBase( p.base, m, s );

	vec3 translucency = textureMaterial( p.translucencyTexture, m.vertexTexCoord, vec4(1.0,1.0,1.0,0.0) ).xyz;
	translucency *= p.translucencyColor;

	HINT_FLATTEN
	if( p.translucencyTexture & THINSURFACE_FLAG_USEALBEDO )
	{ translucency *= m.albedo.rgb; }

    m.thinTranslucency = translucency;
	m.thinScatter      = p.translucencyScatter;
}

void TransmissivityThinSurfaceMerge( in MaterialState m, inout FragmentState s )
{
    TransmissivityBaseMerge( m, s );

    s.transmissivity = m.thinTranslucency;
	s.thinScatter    = m.thinScatter;
}

#define TransmissivityParams		TransmissivityThinSurfaceParams
#define Transmissivity(p,m,s)		TransmissivityThinSurface(p.transmissivity,m,s)
#define TransmissivityMerge			TransmissivityThinSurfaceMerge
#define TransmissivityMergeFunction	TransmissivityThinSurfaceMerge
