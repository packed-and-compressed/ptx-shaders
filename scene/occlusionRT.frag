#include "data/shader/common/const.sh"
#include "data/shader/common/ldsampler.comp"
#include "data/shader/common/util.sh"
#include "data/shader/common/differential.sh"
#include "data/shader/common/dispatchSwizzle.comp"
#include "data/shader/common/unproject.sh"
#include "data/shader/mat/surface/normalAdjust.frag"
#include "data/shader/scene/raytracing/common.comp"

#define OCCLUSION_SAMPLE 4
#define EPSILON 1e-2f
#define DEPTH_THRESHOLD 5000

uniform uint2	uScreenSize;
uniform vec2	uInvScreenSize;
uniform vec4    uOcclusionParams; //{ strength, radius, bias, seed }
uniform mat4	uInvViewMatrix;
uniform float	uNormalAdjust;

USE_TEXTURE2D_NOSAMPLER(tDepth);
USE_TEXTURE2D_NOSAMPLER(tVertexNormal);

#ifdef OCCLUSION_PREPASS_RTAO
	//RTAO prepass features texture
	USE_TEXTURE2DARRAY_NOSAMPLER(tFeatures);
#else
	//raster prepass normal texture
	USE_TEXTURE2D_NOSAMPLER(tNormal);
#endif

vec3 samplePosition( const uint2 coord )
{
	const vec2 uv = ( vec2(coord) + vec2(0.5,0.5) ) * uInvScreenSize;
	const float depth = imageLoad( tDepth, coord ).x;
	return unprojectViewDepthToViewPos( uv, depth );
}

vec3 sampleNormal( const uint2 coord )
{
#ifdef OCCLUSION_PREPASS_RTAO
	//RTAO prepass outputs to RT features; read normal from array slice 1
	vec3 normal = imageLoadArray( tFeatures, coord, 1 ).xyz;
	normal = normal * 2.0 - 1.0;
#else
	vec3 normal = imageLoad( tNormal, coord ).xyz;
#endif
	// convert view space normal to world space normal
	normal = normalize( mulVec( uInvViewMatrix, normal ) );
	return normal;
}

vec3 sampleVertexNormal( const uint2 coord )
{
	vec3 vertexNormal = imageLoad( tVertexNormal, coord ).xyz;
	vertexNormal = vertexNormal * 2.0 - 1.0;
	// convert view space normal to world space normal
	vertexNormal = normalize( mulVec( uInvViewMatrix, vertexNormal ) );
	return vertexNormal;
}

vec3 sampleSphereUniform( const vec2 r )
{
	const float z = 1.0 - 2.0 * r.x;
	const float sin_theta = sqrt( 1.0 - z*z );
	const float cos_phi = cos( TWOPI * r.y );
	const float sin_phi = sin( TWOPI * r.y );
	return vec3( cos_phi * sin_theta, sin_phi * sin_theta, z );
}

vec3 sampleHemisphereCosine( const vec2 r, const vec3 normal )
{
	//cosine-weighted hemisphere distribution can be sampled without tangent basis
	//by sampling uniformly on a sphere and biasing by normal direction.
	//I've seen a formal proof of this somewhere but can't find it atm (I swear it works though :P) ~ms
	return normalize( normal + sampleSphereUniform( r ) );
}

float traceRayAO( Ray ray, inout RNG rng, inout float totalDist )
{
	RayHit hit;
	RayPayload payload;
	#if defined(TraceTransparencyDither)
		payload.rng = rng;
	#endif
	const bool isOccluded = traceRay( SceneTraceable, RT_RAYTYPE_SECONDARY, ray, payload, hit );
	#ifdef WITH_OCCLUSION_DISTANCE
		if( isOccluded )
		{ totalDist += hit.distance; }
		else
		{ totalDist += 10000.0; }
	#endif
	#if defined(TraceTransparencyDither)
		rng = payload.rng;
	#endif
	return isOccluded ? 0.0 : 1.0;
}

float calculateAO(
	Ray ray,
	const vec3 normal,
	const uint2 screenCoord,
	inout RNG rng,
	out float totalDist )
{
	totalDist = 0.0;
	float ao = 0.0;
	
	//loop through AO samples, trace rays and accumulate AO contributions
	//each iteration traces two samples for XY and ZW low-discrepancy random number pairs
	for( int i = 0; i < OCCLUSION_SAMPLE/2; ++i )
	{
		const vec4 r = ldsRandVec4( rng, screenCoord, 4 * i );

		//sample cosine distribtion and accumulate visibility #1
		ray.direction = sampleHemisphereCosine( r.xy, normal );
		ao += traceRayAO( ray, rng, totalDist );
		
		//sample cosine distribtion and accumulate visibility #2
		ray.direction = sampleHemisphereCosine( r.zw, normal );
		ao += traceRayAO( ray, rng, totalDist );
	}

    totalDist *= (1.0 / OCCLUSION_SAMPLE);
	return ao * (1.0 / OCCLUSION_SAMPLE);
}

float evaluateAO( const uint2 screenCoord, out float distance )
{
    // parameters
    const float strength = uOcclusionParams.x;
    const float radius   = uOcclusionParams.y;
    const float rayBias  = uOcclusionParams.z;
    const uint  seed     = asuint( uOcclusionParams.w );
	// random number generator
	RNG	rng = rngInit( screenCoord.x | ( screenCoord.y<<16 ), seed );
	// view space position
	const vec3  position = samplePosition( screenCoord );
	float ao = 1.0;
	distance = INFINITY;
	if( position.z <= 0.0 && position.z > -1.0e11 )
	{
		// calculate depth (view space) before we convert our position to world space for tracing
		const float depth = abs( position.z );
		// fragment state
		FragmentState state;
		// calculate eye vector in view space then convert to world space using view space position
		state.vertexEye = normalize( mulVec( uInvViewMatrix, -position ) );
		// convert view space position to world space position
		state.vertexPosition = mulPoint( uInvViewMatrix, position ).xyz;
		// sample prepass normals
		state.normal = sampleNormal( screenCoord );
		state.vertexNormal = sampleVertexNormal( screenCoord );
		// geometry normal (using vertex normal because the edge of dfdx/dfdy of world position is too obvious in
		// AO render passes, even though not the case in main pass)
		state.geometricNormal = state.vertexNormal;
        if( dot( state.normal, state.geometricNormal ) < 0.0 )
        {
            state.normal = -state.normal;
        }

#if 0 //FIXME: do we even need this, and if so, what should the adjustment value be? ~ms
	#ifdef SurfaceNormalAdjust
		// adjust surface normal to prevent it from being too close to the tangent/bitangent plane
		state.normalAdjust = uNormalAdjust;
		SurfaceNormalAdjust( state );
	#endif
#endif

		// construct the ray we trace
		Ray ray;
        ray.origin = state.vertexPosition;
        ray.minT   = 0.0;
        ray.maxT   = radius > 0.0 ? radius : INFINITY;
		// adjust starting position (for raster)
		ray.origin = rayOriginAdjust( ray.origin, state.geometricNormal );
		{
			// additional shadow offset if necessary, this is to compensate the error in unprojecting
			// from depth (inverse projection and inverse view both introduce some error, and can amplify
			// depending on depth)
			const float rayEpsilon = mix( EPSILON, 1.0, min( exp(depth - DEPTH_THRESHOLD), 1.0 ) );
			ray.origin += ( state.normal * ( rayBias + rayEpsilon ) );
		}
		// calculate ambient occlusion 
		ao = calculateAO( ray, state.normal, screenCoord, rng, distance );
		ao = pow( ao, strength );
	}
	return ao;
}

USE_LOADSTORE_TEXTURE2D(float,tOcclusion,0);
#ifdef WITH_OCCLUSION_DISTANCE
	USE_LOADSTORE_TEXTURE2D(float,tDistance,1);
#endif
COMPUTE(8,8,1)
{
	const uint2 screenCoord = DISPATCH_THREAD_ID_8x8.xy;
	if( screenCoord.x >= uScreenSize.x || screenCoord.y >= uScreenSize.y )
	{ return; }

	float distance;
	const float ao = evaluateAO( screenCoord, distance );
	
	imageStore( tOcclusion, screenCoord, vec4(ao, ao, ao, 1.0) );
	#ifdef WITH_OCCLUSION_DISTANCE
		imageStore( tDistance, screenCoord, vec4(distance, 0.0, 0.0, 0.0) );
	#endif
}
