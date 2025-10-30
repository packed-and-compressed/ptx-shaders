//inherits subsurfaceBase

void	TransmissivitySubsurfaceScatter(in TransmissivitySubsurfaceParams p, inout MaterialState m, in FragmentState s )
{
	TransmissivitySubsurfaceBase( p, m, s );

	m.scatterDepth  = textureMaterial( p.scatterTexture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).rgb;
	m.scatterDepth *= p.scatterDepth.rgb;
	m.scatterAniso  = p.scatterDepth.w;
}

void 	TransmissivitySubsurfaceScatterMerge( in MaterialState m, inout FragmentState s )
{
	TransmissivitySubsurfaceBaseMerge( m, s );

	s.scatterColor = uSubsurfaceUseScatterColor ? m.scatterColor : vec3(1.0, 1.0, 1.0);
	s.scatterDepth = m.scatterDepth;

	//see "Practical and Controllable Subsurface Scattering for Production Path Tracing", M. Chiang, P. Kutz, B. Burley.
	vec3 A   = s.scatterColor;
	vec3 a   = vec3(1.0,1.0,1.0) - exp( A * (-5.09406 + A * (2.61188 - A * 4.31805)) );
	vec3 mfp = m.scatterDepth; //mean free path

	s.mediumExtinction	= rcp( max(mfp, 1e-4) );
	s.mediumScatter		= s.mediumExtinction * a;
	s.mediumAnisotropy	= m.scatterAniso;
}

#define TransmissivityParams		TransmissivitySubsurfaceParams
#define Transmissivity(p,m,s)		TransmissivitySubsurfaceScatter(p.transmissivity,m,s)
#define TransmissivityMerge			TransmissivitySubsurfaceScatterMerge
#define TransmissivityMergeFunction	TransmissivitySubsurfaceScatterMerge