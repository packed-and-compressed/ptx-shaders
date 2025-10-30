#include "dilatePack.frag"

BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//zero offset, solid bit is 1 indicating presence of geometry
	OUT_COLOR0.x = asfloat(packDilation( int2(0,0), DILATION_SOLID ));
	OUT_COLOR0.yzw = vec3( 0, 0, 0 );
}
