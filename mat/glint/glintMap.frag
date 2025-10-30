#include "data/shader/mat/state.frag"

#define GLINT_FLAG_USEMICROSURFACE	(1u<<27)

struct	GlintMapParams
{
	uint	glintTexture;
	float	glintIntensity;
	uint	roughnessTexture;
	uint	roughnessScaleBias;
};
void	GlintMap( in GlintMapParams p, inout MaterialState m, in FragmentState s )
{
	//glint map
	float glintMap = textureMaterial( p.glintTexture, m.vertexTexCoord, 1.0 );
	m.glintIntensity = p.glintIntensity * glintMap;

	//glint microfacet
    m.glintUseMicrosurface = ( p.roughnessTexture & GLINT_FLAG_USEMICROSURFACE ) != 0;
	
	//glint roughness
    if( m.glintUseMicrosurface )
	{
        m.glintGlossOrRoughness = m.glossOrRoughness;
        m.glintRoughnessFromGloss = !m.glossFromRoughness;
    }
	else
	{
		float glintRoughness = textureMaterial( p.roughnessTexture, m.vertexTexCoord, 1.0 );
        m.glintGlossOrRoughness = scaleAndBias( glintRoughness, p.roughnessScaleBias );
        m.glintRoughnessFromGloss = false;

    }
}

void GlintMapMerge( in MaterialState m, inout FragmentState s )
{
    s.glintIntensity = (half)m.glintIntensity;
    s.glintUseMicrofacet = m.glintUseMicrosurface;
    if( m.glintRoughnessFromGloss )
    {
        s.glintRoughness = (half)saturate( 1.0 - m.glintGlossOrRoughness );
    }
	else
    {
        s.glintRoughness = (half)m.glintGlossOrRoughness;

    }
}

#define GlintParams		    GlintMapParams
#define	Glint(p,m,s)        GlintMap(p.glint,m,s)
#define GlintMerge		    GlintMapMerge
#define GlintMergeFunction  GlintMapMerge