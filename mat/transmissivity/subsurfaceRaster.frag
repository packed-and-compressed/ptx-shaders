//inherits subsurfaceBase

uniform uint uScatterUseAlbedo;

void    TransmissivitySubsurfaceRaster( in TransmissivitySubsurfaceParams p, inout MaterialState m, in FragmentState s )
{
	TransmissivitySubsurfaceBase( p, m, s );

	const bool flagUseTranslucency = p.scatterTexture & SUBSURFACE_FLAG_USETRANSLUCENCY;
	m.scatterColor = p.scatterDepth.rgb * textureMaterial( p.scatterTexture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).rgb;
	m.scatterDepth = vec3( p.scatterDepth.w, 0.0, 0.0 );
	m.scatterTranslucency = flagUseTranslucency ? p.scatterDepth.rgb : vec3(0.0, 0.0, 0.0);
}

void	TransmissivitySubsurfaceRasterMerge( in MaterialState m, inout FragmentState s )
{
	TransmissivitySubsurfaceBaseMerge( m, s );

	s.transmissivity = uScatterUseAlbedo ? s.albedo.rgb : vec3(1.0, 1.0, 1.0);
	s.scatterColor   = m.scatterColor;
	s.scatterDepth   = m.scatterDepth;

	float translucencyMask = maxcomp(m.scatterTranslucency) > 0.0 ? 1.0 : 0.0;
	s.translucencyColor = vec4( m.scatterTranslucency, translucencyMask );
}

#define TransmissivityParams		TransmissivitySubsurfaceParams
#define Transmissivity(p,m,s)		TransmissivitySubsurfaceRaster(p.transmissivity,m,s)
#define TransmissivityMerge			TransmissivitySubsurfaceRasterMerge
#define TransmissivityMergeFunction	TransmissivitySubsurfaceRasterMerge
