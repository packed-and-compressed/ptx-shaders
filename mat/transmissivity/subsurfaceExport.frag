//inherits subsurfaceBase

void    TransmissivitySubsurfaceExport( in TransmissivitySubsurfaceParams p, inout MaterialState m, in FragmentState s )
{
	TransmissivitySubsurfaceBase( p, m, s );
	
    m.scatterColor = p.scatterDepth.rgb * textureMaterial( p.scatterTexture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).rgb;
	m.scatterDepth = vec3( p.scatterDepth.w, 0.0, 0.0 );
}

void    TransmissivitySubsurfaceExportMerge( in MaterialState m, inout FragmentState s )
{
	TransmissivitySubsurfaceBaseMerge( m, s );

	s.scatterColor = m.scatterColor;
	s.scatterDepth = m.scatterDepth;

    float t    = s.transmission;
    s.generic0 = vec4( s.scatterColor, s.scatterDepth.r );
    s.generic1 = vec4( t, t, t, 1.0 );
    s.generic2 = vec4( s.fuzz, 1.0 );
}

#define TransmissivityParams        TransmissivitySubsurfaceParams
#define Transmissivity(p,m,s)		TransmissivitySubsurfaceExport(p.transmissivity,m,s)
#define TransmissivityMerge			TransmissivitySubsurfaceExportMerge
#define TransmissivityMergeFunction	TransmissivitySubsurfaceExportMerge
