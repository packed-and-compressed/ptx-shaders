USE_TEXTURE2D(tAlphaMap);
USE_TEXTURE2D(tAlbedoMap);

uniform vec4	uAlphaSwizzle;
uniform vec2	uUseAlbedoAlpha;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	float alpha = dot( texture2D( tAlphaMap, fCoord ), uAlphaSwizzle );
	float albedoAlpha = texture2D( tAlbedoMap, fCoord ).a;
	
	albedoAlpha = saturate( albedoAlpha * uUseAlbedoAlpha.x + uUseAlbedoAlpha.y );
	alpha *= albedoAlpha;

	OUT_COLOR0 = alpha;
}
