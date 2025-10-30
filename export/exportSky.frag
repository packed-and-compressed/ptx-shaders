USE_TEXTURECUBE(tSky);

uniform vec4	uRands[IMPORTANCE_SAMPLES];
uniform float	uBrightness;

#define	PI	3.14159265359

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//determine UV coords
	vec2 uv = fCoord;
	uv.y = fract( uv.y * 8.0 );
	uv = 2.0*uv - vec2(1.0,1.0);

	//edge padding on UVs (1 pixel around 256 square border)
	uv *= 256.0/254.0;
	if( abs(uv.x) > 1.0 )
	{ uv.y = -uv.y - sign(uv.y)*1.0/256.0; uv.x *= 253.0/255.0; }
	if( abs(uv.y) > 1.0 )
	{ uv.x = -uv.x - sign(uv.x)*1.0/256.0; uv.y *= 253.0/255.0; }
	
	//determine direction from octahedral layout
	vec3 dir;
	{
		if( (abs(uv.x) + abs(uv.y)) <= 1.0 )
		{
			//positive hemisphere
			dir = vec3( uv.x, 1.0-abs(uv.x)-abs(uv.y), uv.y );
		}
		else
		{
			//negative hemisphere
			vec2 signuv = sign(uv);
			uv = signuv - (signuv.x*signuv.y)*uv.yx;
			dir = vec3( uv.x, abs(uv.x)+abs(uv.y)-1.0, uv.y );
		}
		dir = normalize(dir);
	}
	
	//determine gloss
	float gloss = floor( fCoord.y * 8.0 ) / 7.0;
	
	//default is just regular sample
	vec3 s = textureCube( tSky, dir ).xyz;

	//ggx convolution
	HINT_BRANCH
	if( gloss < 0.999 )
	{
		float roughness = 1.0 - gloss;
		float a = max( roughness * roughness, 1e-4 );
		float k = a * 0.5;
		float a2 = a * a;

		vec3 basisX = normalize( cross( dir, vec3(0.0, 1.0, saturate(dir.y*10000.0 - 9999.0) ) ) );
		vec3 basisY = cross( basisX, dir );
		vec3 basisZ = dir;
		s = vec3( 0.0, 0.0, 0.0 );

		float lodBase = 0.5 * log2( (256.0*256.0)/float(IMPORTANCE_SAMPLES) ) + 1.5*gloss*gloss;

		float totalWeight = 0.0;

		HINT_LOOP
		for( int i=0; i<IMPORTANCE_SAMPLES; ++i )
		{
			vec3 H;
			{
				vec4 rnd = uRands[i];
				float cosTheta = sqrt( (1.0 - rnd.x) / ((a2 - 1.0) * rnd.x + 1.0) );
				float sinTheta = sqrt( 1.0 - cosTheta * cosTheta );
				float cosPhi = rnd.z, sinPhi = rnd.w;
				H = vec3( cosPhi*sinTheta, sinPhi*sinTheta, cosTheta );
				H = H.x*basisX + H.y*basisY + H.z*basisZ;
			}

			vec3 N = dir, V = dir;
			vec3 L = 2.0 * dot( V, H ) * H - V;

			float NdotL = dot( N, L );
			if( NdotL > 0.0 )
			{
				float NdotH = saturate( dot( N, H ) );
				float VdotH = NdotH;
				float d = (NdotH * a2 - NdotH) * NdotH + 1.0;
				float pdf = (NdotH * a2) / ((4.0 * 3.141593) * d*d * VdotH);
				float lod = lodBase - 1.0*log2( pdf );

				s += textureCubeLod( tSky, L, lod ).xyz * NdotH;
				totalWeight += NdotH;
			}
		}
		s /= totalWeight;
	}

	vec4 r; r.xyz = s * uBrightness; r.w = 1.0;
	{
		//RGBM encode
		vec3 v = (1.0/7.0)*sqrt(r.xyz);
		float m = saturate( max( v.x, max( v.y, v.z ) ) );
		m = ceil( m * 255.0 ) / 255.0;
		if( m > 0.0 )
		{ r.xyz = v.xyz / m; }
		r.w = m;
	}
	OUT_COLOR0 = r;
}