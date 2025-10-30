#include "utils.frag"

uniform float	uEpsilon;

HINT_EARLYDEPTHSTENCIL
BEGIN_PARAMS
	INPUT0(vec3,fPosition)
	INPUT1(vec2,fTexCoord)
	INPUT2(vec3,fBakeDir)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	// find trace direction and origin
	Ray ray;
	ray.minT = 0.0;
	ray.maxT = uTraceOffsetRange.y;
	ray.direction = -findTraceDirection( fPosition, normalize( fBakeDir ), fTexCoord );
	ray.origin = fPosition + uEpsilon*ray.direction;

	float cageDist = 1.0;

	//trace ray to see if we hit the low poly mesh
	RayHit hit;
	RayPayload payload;
	#ifdef TraceTransparencyDither
		payload.rng = rngInit( ushort2(IN_POSITION.xy), 0 );
	#endif
	if( traceRay( SceneTraceable, RT_RAYTYPE_BAKE, ray, payload, hit ) )
	{
		//set the cage distance a little closer than the intersection, normalize it to cage range
		cageDist = hit.distance * 0.95;
		cageDist = saturate( (cageDist - uTraceOffsetRange.x) / (uTraceOffsetRange.y - uTraceOffsetRange.x) );
	}

	OUT_COLOR0 = vec4( cageDist, 1.0, 1.0, 1.0 );
}
