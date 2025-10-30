USE_TEXTURECUBE(tSkyTexture);
uniform float	uSkyBrightness;

#define	SAMPLE_COUNT	32
uniform vec4	uSampleKernel[SAMPLE_COUNT/2];
uniform float	uSampleLod;

BEGIN_PARAMS
	INPUT0(vec3,skyBoxCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 basisZ = normalize( skyBoxCoord );
	vec3 basisX = normalize( cross( vec3(0.0,1.0,0.0), basisZ ) );
	vec3 basisY = cross( basisZ, basisX );
	
	vec3 color = vec3( 0.0, 0.0, 0.0 );
	HINT_UNROLL
	for( int i=0; i<SAMPLE_COUNT/2; ++i )
	{
		vec4 s = uSampleKernel[i];

		vec3 s0 = (basisZ + s.x*basisX) + s.y*basisY;
		color += textureCubeLod( tSkyTexture, s0, uSampleLod ).xyz;

		vec3 s1 = (basisZ + s.z*basisX) + s.w*basisY;
		color += textureCubeLod( tSkyTexture, s1, uSampleLod ).xyz;
	}

	OUT_COLOR0.xyz = color * (uSkyBrightness / float(SAMPLE_COUNT));
	OUT_COLOR0.w = 0.0;
}