#include "screenRayTrace.frag"
#include "../common/ldsampler.comp"
#include "data/shader/common/unproject.sh"

USE_TEXTURE2D(tNormal);
USE_TEXTURE2D(tReflectivity);

uniform float	uRandomSeed;

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

	OUTPUT_COLOR0(vec2)
	OUTPUT_COLOR1(float)
END_PARAMS
{
	//position & eye vector (fCoord in screenspace coord here, not NDC)
	vec3 position = samplePosition( fCoord );
	vec3 eye = normalize( -position );

	//normal
	vec3 normal = texture2DLod( tNormal, fCoord, 0.0 ).xyz;
		
	//fade out for normals that point away from the eye
	//(since reflected ray will probably just trace onto the starting point)
	float EdotN = dot( eye, normal );
	float fade = saturate( EdotN*32.0 - (1.0/32.0) );

	//fade out for reflections pointing near the camera
	fade *= saturate( 5.0 - 5.5*EdotN );

	//do not trace the background
	fade = position.z < -1.0e11 ? 0.0 : fade;

	//check and see if our fade has allowed us to proceed
	vec2 hitCoords = vec2(0.0, 0.0);
	float hitMask = 0.0;
	HINT_BRANCH
	if( fade > 0.0 )
	{
		//basis for probability orientation
		vec3 basisX = normalize( cross( normal, vec3(0.0, 1.0, saturate(normal.y*10.0 - 9.0) ) ) );
		vec3 basisY = cross( basisX, normal );
		vec3 basisZ = normal;

		//ggx sampling
		float roughness = 1.0 - texture2DLod( tReflectivity, fCoord, 0.0 ).a;
		float a = roughness * roughness;
		float a2 = a * a;

		vec2 r;
		if( uRandomSeed < 0.0 )
		{
			r = ldsRandVec4( uint2(IN_POSITION.xy), 0 ).zw;
		}
		else
		{
			vec2 rbase = IN_POSITION.xy + position.zz;
			r = vec2(	rand(rbase + vec2(0.0,uRandomSeed)),
						rand(rbase + vec2(uRandomSeed,0.0))	);
		}

		float cosTheta = sqrt( (1.0 - r.x) / ((a2 - 1.0) * r.x + 1.0) );
		float sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
		float cosPhi = cos( (2.0 * 3.141592) * r.y );
		float sinPhi = sin( (2.0 * 3.141592) * r.y );
		vec3 h = vec3( cosPhi*sinTheta, sinPhi*sinTheta, cosTheta );
		h = h.x*basisX + h.y*basisY + h.z*basisZ;

		//get reflection vector from half vector
		vec3 dir = reflect( -eye, h );

		//trace the ray
		traceRay( position, dir, hitCoords, hitMask );
		hitMask *= fade;

		//if ray was 'under the surface', unweight it
		hitMask = dot( dir, normal ) > 0.0 ? hitMask : 0.0;
	}

	//done
	OUT_COLOR0.xy = hitCoords;
	OUT_COLOR1 = 1.0 - hitMask;
}
