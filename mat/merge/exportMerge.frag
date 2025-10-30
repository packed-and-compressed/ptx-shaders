#include "data/shader/mat/state.frag"

#ifndef	USE_OUTPUT1
	#define	USE_OUTPUT1
#endif

#ifndef	USE_OUTPUT2
	#define	USE_OUTPUT2
#endif

#ifndef	USE_OUTPUT3
    #define	USE_OUTPUT3
#endif

#ifndef USE_OUTPUT4
	#define USE_OUTPUT4
#endif

#ifndef USE_OUTPUT5
	#define USE_OUTPUT5
#endif

#ifndef USE_OUTPUT6
	#define USE_OUTPUT6
#endif

#ifndef USE_OUTPUT7
	#define USE_OUTPUT7
#endif

void	ExportMerge( inout FragmentState s )
{
	//energy conservation
	s.albedo.rgb *= saturate( 1.0 - s.metalness );
	s.sheen		 *= saturate( 1.0 - s.metalness );
}

void	ExportOutput( inout FragmentState s )
{
	//albedo & alpha
	s.output0.xyz = sqrt( s.albedo.xyz );
	s.output0.w = s.albedo.w;

	//reflectivity & gloss
	s.output1.xyz = sqrt( s.reflectivity );
	s.output1.w = s.gloss;

	//normal
	s.output2.xyz = 0.5*s.normal + vec3(0.5,0.5,0.5);
    
    //emissive
    s.output3.xyz = sqrt( s.emission );

	//extra1
    s.output4 = sqrt( s.generic0 );
	
	//extra2
	s.output5 = sqrt( s.generic1 );

	//extra3
	s.output6.rgb = sqrt( s.generic2.rgb );
	s.output6.a = s.generic2.a;

	//extra4
	s.output7.xyz = 0.5*s.generic3.xyz + vec3(0.5,0.5,0.5);
	s.output7.w = s.generic3.w;
}

#define Merge	ExportMerge
#define Output	ExportOutput
