#include "../common/rng.comp"

USE_BUFFER(vec4, bHemisphereDirections);

uniform uint	uHemisphereBaseIndex;
uniform float	uHemisphereOffsetEstimate;
uniform float	uMinDistance;
uniform float	uMaxDistance;
uniform uint	uRayCount;
uniform vec2	uCosineScaleBias;
uniform float	uFloorOcclusion;

struct	HemisphereSample
{
	float	ao;
	float	thickness;
	vec3	bentNormal;
};

HemisphereSample	hemisphereSample( vec3 position, vec3 normal, float offset, ushort2 seed, uint subpass )
{
	vec3 basisZ = normal;
	vec3 basisX;
	{
		if( abs(basisZ.y) < 0.999 )
		{ basisX = vec3(-basisZ.z, 0, basisZ.x); }
		else
		{ basisX = vec3(0, basisZ.z, -basisZ.y); }
		basisX = normalize( basisX );
	}
	vec3 basisY = cross( basisZ, basisX );

	//dither ray direction by rotating basis
	{
		RNG rng = rngInit( seed, 0 );
		float sinTheta, cosTheta;
		sincos( TWOPI * rngNextFloat( rng ), sinTheta, cosTheta );
		vec3 bx = basisX, by = basisY;
		basisX =  cosTheta*bx + sinTheta*by;
		basisY = -sinTheta*bx + cosTheta*by;
	}

	Ray ray;
	ray.origin = position + offset * basisZ;
	ray.minT = uMinDistance;
	ray.maxT = uMaxDistance;

	RayPayload payload;
	#ifdef TraceTransparencyDither
		payload.rng = rngInit( seed, 7 );
	#endif

	HemisphereSample r;
	r.ao = 0.0;
	r.thickness = 0.0;
	r.bentNormal = vec3(0,0,0);
	float wTotal = 0.0, wHits = 0.0;
	for( uint i=0; i<uRayCount; ++i )
	{
		vec3 dir = bHemisphereDirections[(uHemisphereBaseIndex + subpass*uRayCount) + i].xyz;
		ray.direction = dir.x * basisX + dir.y * basisY + dir.z * basisZ;

		float w = saturate( uCosineScaleBias.x * dir.z + uCosineScaleBias.y );
		
		RayHit hit;
		if( traceRay( SceneTraceable, RT_RAYTYPE_BAKE, ray, payload, hit ) )
		{
			r.ao += w;
			r.thickness += w * hit.distance;
			wHits += w;
		}
		else
		{
			HINT_FLATTEN
			if( ray.direction.y < 0.0 )
			{ r.ao += uFloorOcclusion * w; }

			r.bentNormal += w * ray.direction;
		}
		wTotal += w;
	}

	if( wTotal > 0.0 )
	{ r.ao = 1.0 - r.ao / wTotal; }
	else
	{ r.ao = 1.0; }

	if( wHits > 0.0 )
	{ r.thickness /= wHits; }

	if( dot(r.bentNormal,r.bentNormal) > 0.0 )
	{ r.bentNormal = normalize( r.bentNormal ); }
	else
	{ r.bentNormal = normal; }

	return r;
}
