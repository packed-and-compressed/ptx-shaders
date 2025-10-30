#include "data/shader/mat/state.frag"

#define OCCLUSION_FLAG_USEVERTEXCOLOR	(1u<<28)

struct	OcclusionMapParams
{
	uint occlusionTexture;
	uint occlusionStrength;
	uint cavityTexture;
	uint cavityStrength;
};
void 	OcclusionMap( in OcclusionMapParams p, inout MaterialState m, in FragmentState s )
{
	bool useVertexColor = p.occlusionTexture & OCCLUSION_FLAG_USEVERTEXCOLOR;

	float occlusion = textureMaterial( p.occlusionTexture, m.vertexTexCoord, 1.0 );

	if( useVertexColor )
	{
		uint channel = p.occlusionStrength >> 16;
		switch( channel )
		{
		case 0: occlusion *= s.vertexColor.r; break;
		case 1: occlusion *= s.vertexColor.g; break;
		case 2: occlusion *= s.vertexColor.b; break;
		case 3: occlusion *= s.vertexColor.a; break;
		}
	}

	float occlusionStrength = f16tof32( p.occlusionStrength );
	m.occlusion = occlusion * occlusionStrength + ( 1.0 - occlusionStrength );
}

void	OcclusionMapMerge( in MaterialState m, inout FragmentState s )
{
#if defined(MSET_RAYTRACING)
	s.skyOcclusion *= m.occlusion;
#else
    s.occlusion		= m.occlusion;
#endif
#if defined(MATERIAL_PASS_EXPORT)
	s.output2.a     = sqrt( s.occlusion );
#endif
}

void OcclusionMapLighting( inout FragmentState s )
{
#if !defined(MSET_RAYTRACING)
    s.diffuseLight *= s.occlusion;
#endif
}

#define OcclusionParams				OcclusionMapParams
#define Occlusion(p,m,s)			OcclusionMap(p.occlusion,m,s)
#define OcclusionMerge				OcclusionMapMerge
#define OcclusionMergeFunction		OcclusionMapMerge
#define OcclusionLighting			OcclusionMapLighting
#define OcclusionLightingFunction	OcclusionMapLighting

void	CavityMap( in OcclusionMapParams p, inout MaterialState m, in FragmentState s )
{
    m.cavity = textureMaterial( p.cavityTexture, m.vertexTexCoord, 1.0 );
	
	float strengthDiff = f16tof32( p.cavityStrength );
    m.cavityDiffuse = m.cavity * strengthDiff + saturate( 1.0 - strengthDiff );
	
	float strengthSpec = f16tof32( p.cavityStrength>>16 );
    m.cavitySpecular = m.cavity * strengthSpec + saturate( 1.0 - strengthSpec );
}

void	CavityMapMerge( in MaterialState m, inout FragmentState s )
{
#if defined(MSET_RAYTRACING)
	s.albedo.rgb			*= m.cavityDiffuse;
	s.reflectionOcclusion	*= m.cavitySpecular;
#elif defined(MATERIAL_PASS_EXPORT)
	s.albedo.rgb			*= m.cavityDiffuse;
	s.reflectivity			*= m.cavitySpecular;
#else
	s.cavityDiffuse			 = m.cavityDiffuse;
	s.cavitySpecular		 = m.cavitySpecular;
	s.cavity				 = m.cavity;
#endif	
}

void CavityMapLighting( inout FragmentState s )
{
#if !defined(MSET_RAYTRACING)	
    s.diffuseLight *= s.cavityDiffuse;
    s.specularLight *= s.cavitySpecular;
#endif
}

#define Cavity(p,m,s)			CavityMap(p.occlusion,m,s)
#define CavityMerge				CavityMapMerge
#define CavityMergeFunction		CavityMapMerge
#define CavityLighting			CavityMapLighting
#define CavityLightingFunction	CavityMapLighting

