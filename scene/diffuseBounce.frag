#define SCREEN_TRACE_BIAS 2.0
#include "screenRayTrace.frag"
#include "data/shader/common/ldsampler.comp"
#include "data/shader/common/unproject.sh"

USE_TEXTURE2D(tNormal);
USE_TEXTURE2D(tAlbedo);
USE_TEXTURE2D(tScreenColor);

uniform float	uRandomSeed;
uniform float	uDistance;

float	rand( vec2 seed )
{
	vec2 K = vec2( 23.14069263277926, 2.665144142690225 );
	return fract( cos( dot(seed,K) ) * 12345.6789 );
}

vec3 samplePosition( vec2 coord )
{
	const float depth = texture2DLod( tScreenDepth, coord, 0.0 ).x;
	return unprojectViewDepthToViewPos( coord, depth );
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//position & eye vector (fCoord in screenspace coord here, not NDC)
	vec3 position = samplePosition( fCoord );
	vec3 eye = normalize( -position );

	//normal
	vec3 normal = texture2DLod( tNormal, fCoord, 0.0 ).xyz;
	
	//do not trace the background
	float fade = position.z < -1.0e11 ? 0.0 : 1.0;

	//check and see if our fade has allowed us to proceed
	vec3 hitColor = vec3(0.0, 0.0, 0.0);
	HINT_BRANCH
	if( fade > 0.0 )
	{
		//basis for probability orientation
		vec3 basisX = normalize( cross( normal, vec3(0.0, 1.0, saturate(normal.y*10.0 - 9.0) ) ) );
		vec3 basisY = cross( basisX, normal );
		vec3 basisZ = normal;

		//lambertian sampling
		vec2 r;
		if( uRandomSeed < 0.0 )
		{
			r = ldsRandVec4( uint2(IN_POSITION.xy), 0 ).xy;
		}
		else
		{
			vec2 rbase = IN_POSITION.xy + 77.0*position.zz;
			r = vec2(	rand(rbase + vec2(0.0,uRandomSeed)),
						rand(rbase + vec2(uRandomSeed,0.0))	);
		}
		float cosTheta = sqrt( r.x );
		float sinTheta = sqrt( 1.0 - r.x );
		float cosPhi = cos( (2.0 * 3.141592) * r.y );
		float sinPhi = sin( (2.0 * 3.141592) * r.y );
		vec3 dir = vec3( cosPhi*sinTheta, sinPhi*sinTheta, cosTheta );
		dir = dir.x*basisX + dir.y*basisY + dir.z*basisZ;

		//trace the ray
		float hitMask = 0.0; vec2 hitCoords = vec2( 0.0, 0.0 );
		traceRay( position, dir, hitCoords, hitMask );

		//find hit position in 3d, apply distance falloff
		if( hitMask > 0.0 )
		{
			vec3 hitPosition = samplePosition( hitCoords );
			float d2 = dot( hitPosition-position, hitPosition-position );
			float maxDist = uDistance * abs( position.z );
			maxDist *= maxDist;
			hitMask *= saturate( 1.0 - sqrt(d2/maxDist) );
		}

		//if ray was 'under the surface', unweight it
		hitMask = dot( dir, normal ) > 0.0 ? hitMask : 0.0;

		//sample color buffer, apply masking
		hitColor = texture2DLod( tScreenColor, hitCoords, 0.0 ).rgb;
		hitColor = clamp( hitColor, 0.0, 20.0 );
		hitColor *= hitMask * fade;

		//multiply material albedo color
		hitColor *= texture2DLod( tAlbedo, fCoord, 0.0 ).rgb;
	}

	//done
	OUT_COLOR0.rgb = hitColor;
	OUT_COLOR0.a = 0.0;
}
