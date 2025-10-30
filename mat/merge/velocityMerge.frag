#include "data/shader/mat/state.frag"

uniform uint uVelocitySpace;
uniform vec2 uVelocityRange;
uniform vec3 uVelocityScaleBias;

void	VelocityMerge( inout FragmentState s )
{
	vec3 velocity = vec3( 0.0, 0.0, 0.0 );
	if( uVelocitySpace == 0 )
	{
		//screen space (2D)
		velocity.xy = s.vertexMotionNDC * uVelocityScaleBias.xy + uVelocityScaleBias.zz;
	}
	else
	{
		//view space (3D)
		velocity.xyz = s.vertexVelocity * uVelocityScaleBias.x + uVelocityScaleBias.zzz;
	}
	s.output0.rgb = clamp( velocity, uVelocityRange.x, uVelocityRange.y );
}

#define Merge	VelocityMerge
