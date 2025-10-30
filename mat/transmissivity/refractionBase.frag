//inherits transmissivityBase

#include "data/shader/mat/other/remap.frag"

struct TransmissivityRefractionBaseParams
{
	TransmissivityBaseParams base;

	float		index;
	uint		indexTexture;
	uint		glossBiasSquash;
	float		rasterThickness;
	packed_vec3	mediumTint;
	float		mediumDepth;
	uint		mediumDepthTexture;
	packed_vec4	mediumScatter;
	uint		mediumScatterTexture;
};
void TransmissivityRefractionBase( in TransmissivityRefractionBaseParams p, inout MaterialState m, in FragmentState s )
{
	TransmissivityBase( p.base, m, s );

	m.refractionF0 = maxcomp( m.specular );
	if( p.index > 0.0 )
	{
		//IOR not derived from reflectivity
		float index = p.index * textureMaterial( p.indexTexture, m.vertexTexCoord, 1.0 );
		m.refractionF0 = remapIORToReflectivity( index );
	} 

	float glossBias = f16tof32( p.glossBiasSquash );
	if( m.glossFromRoughness )
	{ m.refractionGlossOrRoughness = saturate( m.glossOrRoughness - glossBias ); }
	else
	{ m.refractionGlossOrRoughness = saturate( m.glossOrRoughness + glossBias ); }

	bool tintUseAlbedo    = asuint( p.mediumTint.r ) & 0x80000000;
	m.refractionColor     = tintUseAlbedo ? m.albedo.rgb * abs( p.mediumTint ) : p.mediumTint;
    m.refractionDepth.rgb = textureMaterial( p.mediumDepthTexture, m.vertexTexCoord, vec4( 1.0, 1.0, 1.0, 0.0 ) ).rgb;
	m.refractionDepth.a   = p.mediumDepth;

    m.scatterColor = p.mediumScatter.rgb * textureMaterial( p.mediumScatterTexture, m.vertexTexCoord, vec4( 1.0, 1.0, 1.0, 0.0 ) ).rgb;
	m.scatterAniso = p.mediumScatter.a;

	#if !defined( RASTER_REFRACTION )
	{
		m.refractionSquash    = f16tof32( p.glossBiasSquash>>16 );
		m.refractionThickness = p.rasterThickness;
	}
	#endif
}

void TransmissivityRefractionBaseMerge( in MaterialState m, inout FragmentState s )
{
	TransmissivityBaseMerge( m, s );

	s.transmission = sqrt( s.transmission ); //sqrt to make transmission color more perceptually linear
	s.eta = remapReflectivityToEta( m.refractionF0 );
    s.glossTransmission = m.glossFromRoughness ? saturate( 1.0 - m.refractionGlossOrRoughness ) : m.refractionGlossOrRoughness;

	//apply normal adjustment factor
	HINT_FLATTEN
	if( s.transmission > 0.0 )
	{
		//always use full normal adjustment for refraction
		s.normalAdjust = 1.0;
	}
	
	#if !defined( MSET_RAYTRACING ) || defined( MATERIAL_PASS_HYBRID_PRIMARYHIT ) || defined( MATERIAL_PASS_HYBRID_INDIRECT )
	{
		// only modify the ior for raster
	#if !( defined( MATERIAL_PASS_HYBRID_PRIMARYHIT ) || defined( MATERIAL_PASS_HYBRID_INDIRECT ) )
		s.eta = mix( s.eta, 1.0, m.refractionSquash );
	#endif
        s.refractionThickness = m.refractionThickness;
    }
	#endif

	#if defined(MATERIAL_PASS_EXPORT)
		s.generic2.a = s.transmission;
	#endif
}

#define TransmissivityParams		TransmissivityRefractionBaseParams
#define Transmissivity(p,m,s)		TransmissivityRefractionBase(p.transmissivity,m,s)
#define TransmissivityMerge			TransmissivityRefractionBaseMerge
#define TransmissivityMergeFunction	TransmissivityRefractionBaseMerge