USE_TEXTURE2D(tAlphaMap);
USE_TEXTURE2D(tAlbedoMap);

uniform vec4	uAlphaSwizzle;
uniform vec2	uUseAlbedoAlpha;

uniform float	uTransparencyAlpha;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	float alpha = dot( texture2D( tAlphaMap, fCoord ), uAlphaSwizzle );
	float albedoAlpha = texture2D( tAlbedoMap, fCoord ).a;
	
	albedoAlpha = saturate( albedoAlpha * uUseAlbedoAlpha.x + uUseAlbedoAlpha.y );
	alpha *= albedoAlpha;

	if( uTransparencyAlpha >= 0.0 )
	{
		//write-out alpha test outcome as either 0 or 1
		OUT_COLOR0 = ( alpha >= uTransparencyAlpha ) ? 1.0 : 0.0;
	}
	else
	{
		//write-out raw alpha value
		OUT_COLOR0 = alpha;
	}
}
