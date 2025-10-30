//inherits refractionBase

#include "data/shader/mat/fresnel.frag"

void TransmissivityRefractionRasterMerge( in MaterialState m, inout FragmentState s )
{
    TransmissivityRefractionBaseMerge( m, s );
	
    float NdotV = dot( s.normal, s.vertexEye );
    
	//Fresnel throughput
    vec3 T = oneminus( fresnelSchlick( s.reflectivity, s.fresnel, NdotV ) );
#ifdef REFLECTION_SECONDARY
	     T *= oneminus( fresnelSchlick( s.reflectivitySecondary, s.fresnelSecondary, NdotV ) );
#endif
       
    //effective tint & medium properties
    vec3 tint = sqrt( m.refractionColor * m.refractionDepth.rgb );
    if( m.refractionDepth.a > 0.0 )
    {
        float extinction = rcp( max( m.refractionDepth.a * saturate( maxcomp( m.refractionDepth.rgb ) ), 1e-4 ) );
        s.mediumExtinction = -log( max( tint, 1e-4 ) ) * extinction;
    
        s.mediumExtinction += maxcomp( m.scatterColor.rgb ) * extinction;
        s.mediumAnisotropy = 0.0; //currently not used in raster rendering

        float sin2Refracted = s.eta * s.eta * saturate( 1.0 - NdotV * NdotV );
        float cosRefracted = sqrt( saturate( 1.0 - sin2Refracted ) );
        float thickness = cosRefracted * s.refractionThickness;
        vec3 transmittance = exp( -thickness * s.mediumExtinction );
        s.transmissivity = T * transmittance;
	    
        //approximate single-scattering albedo similarily to volumetric SSS
    	//see "Practical and Controllable Subsurface Scattering for Production Path Tracing", M. Chiang, P. Kutz, B. Burley.
        vec3 A = m.scatterColor.rgb * tint;
        A = mix( A * A, A, exp( -thickness * extinction ) ); //HACK: emulate deepening of apparent scatter color with low depth values in RT mode ~ms
        vec3 a = vec3( 1.0, 1.0, 1.0 ) - exp( A * ( -5.09406 + A * ( 2.61188 - A * 4.31805 ) ) );
		
        //amount of in-scattering is approximated by single-scatter albedo weighted by:
		//- total Fresnel throughput (to account for light that reflects off the surface without transmitting)
		//- 1-transmittance (to account for light that transmits without any scattering)
        s.mediumScatter = T * a * oneminus( transmittance );
		//amount of in-scattering on the other side of the mesh due to translucency is
		//approximed by single-scatter albedo weighted by total transmittance since light needed to go through approx. mesh thickness
		//not including Fresnel throughput here since this is already multiplied by mediumScatter in DiffusionScatterRefraction
        s.scatterColor = a * transmittance;
    }
    else
    {
        //no attenuating medium present, use simple tinting
        s.refractionColor = T * tint;
    }
}

#undef  TransmissivityMerge
#undef  TransmissivityMergeFunction
#define TransmissivityMerge			TransmissivityRefractionRasterMerge
#define TransmissivityMergeFunction	TransmissivityRefractionRasterMerge
