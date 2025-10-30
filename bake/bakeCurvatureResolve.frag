#include "hit.frag"
#include "dither.frag"

USE_TEXTURE2D(tNormals);

uniform vec2	uScaleBias;
uniform float	uStrength;
uniform uint	uDither;
uniform vec2	uKernelSize;

vec3	sampleNormalSoft( vec2 coord, float soften, float minConfidence, out bool valid )
{
	vec4 n = vec4(0,0,0,0);
	for( uint i=0; i<4; ++i )
	{
		vec2 o = soften * uKernelSize * vec2( i & 1 ? 1.0 : -1.0, i & 2 ? 1.0 : -1.0 ); //other pattern?
		n += texture2DLod( tNormals, coord + o, 0.0 );
	}
	n *= 0.25;
	valid = n.a > minConfidence;
	if( valid )
	{
		n.xyz /= n.a;
		n.xyz = normalize( 2.0 * n.xyz - vec3(1,1,1) );
	}
	return n.xyz;
}

BEGIN_PARAMS
	INPUT1(vec2,fTexCoord)
	INPUT2(vec3,fTangent)
	INPUT3(vec3,fBitangent)
	INPUT4(vec3,fNormal)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0.xyz = uScaleBias.yyy; //zero-curvature color
	OUT_COLOR0.w = 0.0;
	
	bool nValid;
	vec3 n = sampleNormalSoft( fTexCoord, 0.2, 0.5, nValid );
	if( !nValid )
	{ return; }
	
	float flip = 1.0;
	if( dot( n, fNormal ) < 0.0 )
	{
		flip = -flip;
	}
	vec3 t = normalize( fTangent - n * dot( fTangent, n ) );
	vec3 b = flip * normalize( fBitangent - n * dot( fBitangent, n ) );

	vec3 positions[4];
	positions[0] = t;
	positions[1] = b;
	positions[2] = normalize( t + b );
	positions[3] = normalize( t - b );

	vec2 offsets[4];
	offsets[0] = vec2( uKernelSize.x, 0             );
	offsets[1] = vec2( 0,             uKernelSize.y );
	offsets[2] = vec2( uKernelSize.x, uKernelSize.y );
	offsets[3] = vec2( uKernelSize.x,-uKernelSize.y );

	float c = 0.0;
	float sampleCount = 0.0;

	HINT_UNROLL
	for( int i = 0; i < 4; ++ i )
	{
		float soften = 0.5, minConfidence = 0.7;
		
		bool leftValid;
		vec3 left = sampleNormalSoft( saturate(fTexCoord - offsets[i]), soften, minConfidence, leftValid );

		bool rightValid;
		vec3 right = sampleNormalSoft( saturate(fTexCoord + offsets[i]), soften, minConfidence, rightValid );

		if( leftValid && !rightValid )
		{
			//extrapolate right sample from center & left
			rightValid = true;
			right = normalize( n + (n - left) );
		}
		else if( !leftValid && rightValid )
		{
			//extrapolate left sample from center & right
			leftValid = true;
			left = normalize( n + (n - right) );
		}

		if( leftValid )
		{
			c += dot( left, -positions[i] );
			sampleCount += 1.0;
		}

		if( rightValid )
		{
			c += dot( right, positions[i] );
			sampleCount += 1.0;
		}
	}

	if( sampleCount > 0.0 )
	{ c /= sampleCount; }

	c *= uStrength;
	c = saturate( uScaleBias.x * c + uScaleBias.y );
	
	if( uDither )
	{ c = dither8bit( vec3(c,c,c), uint2(IN_POSITION.xy) ).x; }
	
	OUT_COLOR0 = vec4( c, c, c, 1.0 );
}

#define PostIntersection	CurvaturePostIntersection
