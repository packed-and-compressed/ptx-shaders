#include "data/shader/mat/state.frag"
#include "data/shader/mat/light.frag"

#ifndef USE_OUTPUT1
	#define	USE_OUTPUT1
#endif
#ifndef USE_OUTPUT2
	#define	USE_OUTPUT2
#endif
void	ScatterOutput( inout FragmentState s )
{
	s.output0.rgb =	 s.diffuseLight;	//scatter light	
	s.output0.a =	 s.generic0.r;		//depth
	s.output1.rgba = s.generic1.rgba;	//scatter color, skin mix
	s.output2.rgb =	 s.generic2.rgb;	//uv spread, depth spread
}

#define	Output	ScatterOutput
