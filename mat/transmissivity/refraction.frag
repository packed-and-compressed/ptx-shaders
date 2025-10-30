//inherits refractionBase

void TransmissivityRefractionMerge( in MaterialState m, inout FragmentState s )
{
    TransmissivityRefractionBaseMerge( m, s );

	//effective tint & medium properties
	vec3 tint = sqrt( m.refractionColor * m.refractionDepth.rgb );
	if( m.refractionDepth.a > 0.0 )
	{
		float depth        = max( m.refractionDepth.a * saturate( maxcomp( m.refractionDepth.rgb ) ), 1e-4 );
		float extinction   = rcp( depth );
		s.mediumExtinction = -log( max( tint, 1e-4 ) ) * extinction;

		//approximate single-scattering albedo similarily to volumetric SSS
		//see "Practical and Controllable Subsurface Scattering for Production Path Tracing", M. Chiang, P. Kutz, B. Burley.
		vec3 A = m.scatterColor * tint;
		vec3 a = vec3(1.0,1.0,1.0) - exp( A * (-5.09406 + A * (2.61188 - A * 4.31805)) );
		s.mediumExtinction += maxcomp( m.scatterColor ) * extinction;
		s.mediumScatter     = s.mediumExtinction * a;
		s.mediumAnisotropy  = m.scatterAniso;
	}
	else
	{
		//no attenuating medium present, use simple tinting
		s.transmissivity = tint;
	}
}

#undef  TransmissivityMerge
#undef  TransmissivityMergeFunction
#define TransmissivityMerge			TransmissivityRefractionMerge
#define TransmissivityMergeFunction	TransmissivityRefractionMerge
