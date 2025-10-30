uniform float	uPremultAlpha;

#ifdef USE_POINT_SPRITE
USE_TEXTURE2D(tTex);
#endif

#define USE_IMMEDIATE 0
#if USE_IMMEDIATE
	uniform vec4	uColor;			//inner color
	uniform vec4	uColorb;		//outer/bordercolor	

	BEGIN_PARAMS
		INPUT0(vec4,    fCoord)	//xy = pixel, zw = point size
		OUTPUT_COLOR0(vec4)
	END_PARAMS
	{
		vec2 xyborder = min(fCoord.zw * 0.5-fCoord.xy, fCoord.zw * 0.5 + fCoord.xy);
		float borderWidth = min(2.0, fCoord.z * 0.25);
		float border = min(xyborder.x, xyborder.y) - 1.0;
		vec4 color = mix(uColor, uColorb, 1.0-saturate(border));
		OUT_COLOR0 = color;
	}
#else
	BEGIN_PARAMS
		INPUT0(vec4,    fCoord)	//xy = pixel, zw = point size
		INPUT1(vec4,	fColor)
		INPUT2(vec4,	fColorb)
		OUTPUT_COLOR0(vec4)
	END_PARAMS
	{
		vec2 texCoord = fCoord.xy + vec2( 0.5, 0.5 );
		vec2 posCoord = fCoord.xy * fCoord.zw;

		vec2 xyborder = min(
			(0.5 * fCoord.zw) - posCoord.xy,
			(0.5 * fCoord.zw) + posCoord.xy );

		float borderWidth = min( 2.0, fCoord.z * 0.25 );
		float border = min(xyborder.x, xyborder.y) - 1.0;
		vec4 color = mix(fColor, fColorb, 1.0-saturate(border));

		#ifdef USE_POINT_SPRITE
			color *= texture2D( tTex, texCoord );
		#endif

		color.rgb *= mix( color.a, 1.0, uPremultAlpha );
		OUT_COLOR0 = color;
	}
#endif