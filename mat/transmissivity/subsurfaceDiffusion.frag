//inherits subsurfaceBase

void	TransmissivitySubsurfaceDiffusion(in TransmissivitySubsurfaceParams p, inout MaterialState m, in FragmentState s )
{
#ifdef MSET_RAYTRACING
	if( !s.allowSubsurfaceDiffusion )
	{ return; }
#endif

	TransmissivitySubsurfaceBase( p, m, s );

#if defined( MATERIAL_PASS_PAINT ) || defined( MATERIAL_PASS_COLOR_SAMPLE )
	m.scatterColor = textureMaterial( p.scatterTexture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).rgb;
	m.scatterDepth = m.scatterColor * p.scatterDepth.rgb;
#else
	m.scatterDepth = textureMaterial( p.scatterTexture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).rgb;
	m.scatterDepth *= p.scatterDepth.rgb;
#endif

}

void	TransmissivitySubsurfaceDiffusionMerge( in MaterialState m, inout FragmentState s )
{
	TransmissivitySubsurfaceBaseMerge( m, s );

	//derive scatter depth (d) via diffuse surface transmission curve fit
	//see "Approximate Reflectance Profiles for Efficient Subsurface Scattering", section 4
	vec3 A   = m.scatterColor;
	vec3 A1  = A - vec3(0.8, 0.8, 0.8);
	vec3 sh  = vec3(1.9, 1.9, 1.9) - A + 3.5 * A1 * A1;
	vec3 mfp = m.scatterDepth; //mean free path
	
	#if defined( MATERIAL_PASS_PAINT ) || defined( MATERIAL_PASS_COLOR_SAMPLE )
		s.scatterColor = m.scatterColor; //needed for PaintMerge
	#else
		s.scatterColor = uSubsurfaceUseScatterColor ? m.scatterColor : vec3(1.0, 1.0, 1.0);
	#endif
	s.scatterDepth = max( mfp * rcp( sh ), 1e-4 );
}

#define TransmissivityParams		TransmissivitySubsurfaceParams
#define Transmissivity(p,m,s)		TransmissivitySubsurfaceDiffusion(p.transmissivity,m,s)
#define TransmissivityMerge			TransmissivitySubsurfaceDiffusionMerge
#define TransmissivityMergeFunction	TransmissivitySubsurfaceDiffusionMerge