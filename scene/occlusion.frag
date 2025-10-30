#define SAMPLE_COUNT 8

#include "data/shader/common/unproject.sh"

USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tNormal);

uniform float	uStrength;
uniform float	uRadius;
uniform float	uRandomSeed;

float	rand( vec2 seed )
{
	vec2 K = vec2( 23.14069263277926, 2.665144142690225 );
	return fract( cos( dot(seed,K) ) * 12345.6789 );
}

vec3 sampleNormal( const vec2 screenCoord )
{
	return texture2DLod( tNormal, screenCoord, 0.0 ).xyz;
}

vec3 samplePosition( vec2 coord )
{
	const float depth = texture2DLod( tDepth, coord, 0.0 ).x;
	return unprojectViewDepthToViewPos( coord, depth );
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
#ifdef RENDERTARGET_Y_DOWN
	vec2 screenCoord = vec2( 0.5, -0.5 ) * fCoord + vec2( 0.5, 0.5 );
#else
	vec2 screenCoord = vec2( 0.5, 0.5 ) * fCoord + vec2( 0.5, 0.5 );
#endif
	vec3  centerPos = samplePosition( screenCoord );
	
	float ao = 1.0;
	HINT_BRANCH
	if( centerPos.z <= 0.0 && centerPos.z > -1.0e11 )
	{
		vec3  centerNorm = sampleNormal( screenCoord );
		float distFactor = rcp( -centerPos.z * 0.16 );
		
		vec2 rbase = IN_POSITION.xy + centerPos.zz;
		float r1 = rand( rbase + vec2(0.0,uRandomSeed) );
		float r2 = rand( rbase + vec2(uRandomSeed,0.0) ) * (1.0/float(SAMPLE_COUNT));

		ao = 0.0;
		HINT_LOOP
		for( int i=0; i<SAMPLE_COUNT; ++i )
		{
			vec2 c;
			{
				float theta = (4.0 * 3.14159265) * r1;
				float radius = uRadius * r2; //would be sqrt(r2) for even disc sampling, but looks nicer without
				c.x = screenCoord.x + radius * cos( theta );
				c.y = screenCoord.y + radius * sin( theta );
			}
			vec3 p = samplePosition( c );
			
			vec3 d = normalize( p - centerPos );
			float cosTheta = saturate( dot( d, centerNorm ) );
			float sinTheta2 = (1.0 - cosTheta*cosTheta);
			float occ = sinTheta2; //integral is sinTheta, but the squared version looks better

			float distfade = saturate( (p.z - centerPos.z) * distFactor );
			occ = max( occ, distfade );

			bool outOfBounds = any(greaterThan(c,vec2(1.0,1.0))) || any(lessThan(c,vec2(0.0,0.0)));
			occ = outOfBounds ? 1.0 : occ;
			ao += occ;
		
			r1 += 1.0/float(SAMPLE_COUNT);
			r2 += 1.0/float(SAMPLE_COUNT);
		}
		ao *= 1.0/float(SAMPLE_COUNT);
		ao = pow( ao, uStrength );

		float smolFade = saturate(uRadius * 1.0/0.004);
		ao = mix( 1.0, ao, smolFade );
	}

	OUT_COLOR0.rgb = vec3(ao,ao,ao);
	OUT_COLOR0.a = 1.0;
}