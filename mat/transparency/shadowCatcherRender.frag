USE_TEXTURE2D(tAlphaMap);

uniform vec4	uAlphaSwizzle;
uniform vec2	uUseAlbedoAlpha;
uniform vec2	uShadowCatcherFadeParams;	// { FadeRadius, FadeFalloff }

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	float alpha = dot( texture2D( tAlphaMap, fCoord ), uAlphaSwizzle );
	alpha *= uUseAlbedoAlpha.y; //alpha scale here

	float fadeRadius  = uShadowCatcherFadeParams.x;
	float fadeFalloff = uShadowCatcherFadeParams.y;
	if( fadeRadius >= 0.0 )
	{
		vec2  fadeCoords  = fadeRadius * (fCoord * 2.0 - 1.0);
		float edgeFade    = saturate( pow( dot(fadeCoords, fadeCoords), fadeFalloff ) );
		alpha            *= 1.0 - edgeFade;
	}

	OUT_COLOR0 = alpha;
}
