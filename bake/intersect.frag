#include "utils.frag"

uniform uint	uHitBaryBits, uHitTriIndexBits;
uniform float	uHitBaryMultiplier;
uniform uint	uObjectIndexBase;
uniform uint	uRNGSeed;

void	insertBits( uint bits, uint bitcount, inout uint hi, inout uint lo ) //no giggling
{
	uint mask = (1U << bitcount) - 1;
	hi <<= bitcount;
	hi |= (lo & (mask << (32-bitcount))) >> (32-bitcount);
	lo <<= bitcount;
	lo |= (bits & mask);
}

HINT_EARLYDEPTHSTENCIL
BEGIN_PARAMS
	INPUT0(vec3,fPosition)
	INPUT1(vec2,fTexCoord)
	INPUT2(vec3,fBakeDir)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//find trace direction and origin
	Ray ray;
	ray.minT = 0.0;
	ray.maxT = INFINITY;
	ray.direction = findTraceDirection( fPosition, normalize( fBakeDir ), fTexCoord );
	ray.origin = findTraceOrigin( fPosition, ray.direction, fTexCoord );

	//trace ray
	RayHit hit;
	RayPayload payload;
	#ifdef TraceTransparencyDither
		payload.rng = rngInit( ushort2(IN_POSITION.xy), uRNGSeed );
	#endif
	uint objectIndex = 0, triangleIndex = 0;
	vec2 bary = vec2(1.0,1.0);
	if( traceRay( SceneTraceable, RT_RAYTYPE_BAKE, ray, payload, hit ) )
	{
		objectIndex = hit.objectIndex + uObjectIndexBase;
		triangleIndex = hit.triangleIndex + 1;
		bary = hit.triangleCoords.xy;
	}

	//encode hit data
	uint hi=0, lo=0;
	lo = objectIndex;
	insertBits( triangleIndex, uHitTriIndexBits, hi, lo );
	insertBits( uint(bary.x * uHitBaryMultiplier + .5), uHitBaryBits, hi, lo );
	insertBits( uint(bary.y * uHitBaryMultiplier + .5), uHitBaryBits, hi, lo );

	OUT_COLOR0.xy = OUT_COLOR0.zw = vec2( asfloat(hi), asfloat(lo) );
}
