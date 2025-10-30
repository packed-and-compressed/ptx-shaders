#include "dither.frag"

USE_TEXTURE2D( tInput );

uniform vec4	uNormalMapParams;
uniform vec4	uClearColor;
uniform vec3	uFlip;
uniform uint	uTangentSpace;
uniform uint	uDither;

vec4	loadNormal( uint2 px )
{
#ifdef PACKED_NORMALS
	//10 bit xyz normal components, with alpha signal in 1 bit
	vec4 r;
	uint p = asuint( imageLoad( tInput, px ).x );
	r.a = (p & 1) ? 1.0 : 0.0;
	r.b = float( (p & (0x3ffu <<  2)) >>  2 ) * (1.0/1023.0);
	r.g = float( (p & (0x3ffu << 12)) >> 12 ) * (1.0/1023.0);
	r.r = float( (p & (0x3ffu << 22)) >> 22 ) * (1.0/1023.0);
	return r;
#else
	return imageLoad( tInput, px );
#endif
}

BEGIN_PARAMS
	INPUT1(vec2,fTexCoord)
	INPUT2(vec3,fTangent)
	INPUT3(vec3,fBitangent)
	INPUT4(vec3,fNormal)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	uint2 pixelCoord = uint2(IN_POSITION.xy);
	vec4 n = loadNormal( pixelCoord );
	if( n.a <= 0.0 )
	{
		//no hit
		n = uClearColor;
	}
	else
	{
		n.xyz /= n.a;
		n.xyz = 2.0*n.xyz - vec3(1,1,1);
		if( uTangentSpace )
		{
			//adjust n to tangent space here
			vec3 nt = n.xyz;
			vec3 T = fTangent, B = fBitangent, N = fNormal;

			//ortho-normalization
			float renormalize = uNormalMapParams.x, orthogonalize = uNormalMapParams.y;
			N = mix( N, normalize( N ), renormalize );
			T -= (orthogonalize * dot( T, N ) ) * N;
			T = mix( T, normalize( T ), renormalize );
			B -= orthogonalize * (dot( B, N ) * N + dot(B,T) * T);
			B = mix( B, normalize( B ), renormalize );

			//regenerate bitangent
			vec3 B2 = cross( N, T );
			B2 = dot( B2, B ) < 0.0 ? -B2 : B2;
			B = mix( B, B2, uNormalMapParams.z );

			if( uNormalMapParams.w > 0.0 )
			{
				//fancier projection; some spaces need this
				vec3 row0 = cross( B, N );
				vec3 row1 = cross( N, T );
				vec3 row2 = cross( T, B );
				float sgn = dot( T, row0 ) < 0.0 ? -1.0 : 1.0;
				nt = normalize( sgn * vec3( dot(n.xyz, row0), dot(n.xyz, row1), dot(n.xyz, row2 ) ) );
			}
			else
			{
				//basic projection
				nt.x = dot( n.xyz, T );
				nt.y = dot( n.xyz, B );
				nt.z = dot( n.xyz, N );
			}
			n.xyz = nt;
		}
		n.xyz *= uFlip;
		n.xyz = 0.5*n.xyz + vec3(0.5,0.5,0.5);

		n.xyz = mix( uClearColor.xyz, n.xyz, n.a );
		if( uDither )
		{ n.xyz = dither8bit( n.xyz, pixelCoord ); }
	}

	OUT_COLOR0 = n;
}
