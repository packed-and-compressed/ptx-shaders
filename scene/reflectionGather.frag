#include "data/shader/common/unproject.sh"

USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tReflGloss);
USE_TEXTURE2D(tNormal);
USE_TEXTURE2D(tReflectionCoord);
USE_TEXTURE2D(tReflectionMask);
USE_TEXTURE2D(tScreenColor);

uniform vec2	uPixelSize;

struct	ShadeParams
{
	vec3	position;
	vec3	normal;
	vec3	eye;
	float	exponent;
};

vec3 samplePosition( vec2 coord )
{
	const float depth = texture2DLod( tDepth, coord, 0.0 ).x;
	return unprojectViewDepthToViewPos( coord, depth );
}

vec4	sampleHit( vec2 coord, vec2 offset, ShadeParams p )
{
	vec4 result = vec4( 0.0, 0.0, 0.0, 0.0 );

	vec2 tc = texture2DLod( tReflectionCoord, coord + offset, 0.0 ).xy + offset;
	if( tc.x > 0.0 || tc.y > 0.0 )
	{
		//neighbor's hit location
		vec3 hit = samplePosition( tc );
		
		//brdf
		vec3 r = normalize( hit - p.position );
		vec3 h = normalize( r + p.eye );
		float dp = saturate( dot(h,p.normal) * 1.01 );
		float brdf = (p.exponent + 4.0)/(8.0*3.141592) * pow( dp, p.exponent );
		const float backgroundZ = -1.0e11;
		brdf = hit.z > backgroundZ ? brdf : 0.0;

		//chase reflections
		vec3 m = vec3(brdf,brdf,brdf);
		vec3 c = m * texture2DLod( tScreenColor, tc, 0.0 ).xyz;
		for( int i=0; i<2; ++i )
		{
			m *= texture2DLod( tReflGloss, tc, 0.0 ).xyz;
			m *= 1.0 - texture2DLod( tReflectionMask, tc, 0.0 ).x;
			tc = texture2DLod( tReflectionCoord, tc, 0.0 ).xy;
			m *= texture2DLod( tDepth, tc, 0.0 ).x > backgroundZ ? 1.0 : 0.0;
			c += m * texture2DLod( tScreenColor, tc, 0.0 ).xyz;
		}
		result.rgb = c;
		result.a = brdf;
	}
	return result;
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	// fCoord here is screenspace coordinate [0, 1]
	vec2 tc = fCoord;
	vec3 color = vec3(0.0,0.0,0.0);
	vec3 m = vec3(1.0,1.0,1.0);

	ShadeParams p;
	p.position = samplePosition( fCoord );
	p.eye = normalize( -p.position );
	p.normal = texture2DLod( tNormal, fCoord, 0.0 ).xyz;
	float gloss = texture2DLod( tReflGloss, fCoord, 0.0 ).a;
	p.exponent = -10.0 / log2( gloss*0.968 + 0.03 );
	p.exponent *= p.exponent;

	float s = frac(IN_POSITION.x*0.5) > 0.0 ? -1.0 : 1.0;
	s *= 1.0 - saturate( (gloss - 0.95)/0.05 );

	vec4 c = sampleHit( fCoord, vec2(0.0,0.0), p );
	HINT_BRANCH
	if( c.a > 0.0 )
	{
		c += sampleHit( fCoord, s*vec2(-4.0, -2.0)*uPixelSize, p );
		c += sampleHit( fCoord, s*vec2( 2.0, -4.0)*uPixelSize, p );
		c += sampleHit( fCoord, s*vec2( 4.0,  2.0)*uPixelSize, p );
		c += sampleHit( fCoord, s*vec2(-2.0,  4.0)*uPixelSize, p );
	}
	c.rgb *= texture2DLod( tReflGloss, fCoord, 0.0 ).rgb;
	c.rgb *= 1.0 - texture2DLod( tReflectionMask, fCoord, 0.0 ).x;

	HINT_FLATTEN
	if( c.a > 0.0 )
	{ color = (c.rgb / c.a); }
	else
	{ color = vec3(0.0,0.0,0.0); }

	OUT_COLOR0 = vec4(color, 1.0f);
}