uniform float usRGB;
uniform float uGrayAlpha;	//use G channel as alpha
uniform float uGray;		//use R channel as for RGB
uniform vec4 uColor;

#ifdef GAMMA_ADJUSTMENT
uniform float uGammaAdjust;
#endif

uniform float uLinearPreviewGamma;

USE_TEXTURE2D_NOSAMPLER(tTexture);
USE_SAMPLER(uSampler);

vec3 sRGBToLinear( vec3 srgb )
{
	vec3 black = srgb * 0.0773993808;	
	vec3 lin = (srgb + vec3(0.055,0.055,0.055)) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin.r = srgb.r <= 0.04045 ? black.r : lin.r;
	lin.g = srgb.g <= 0.04045 ? black.g : lin.g;
	lin.b = srgb.b <= 0.04045 ? black.b : lin.b;
	
	return lin;
}

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS {
	vec4 c = textureWithSampler( tTexture, uSampler, fTexCoord ) * uColor;

	c.a = mix(c.a, c.g, uGrayAlpha);
	c.rgb = mix( c.rgb, sRGBToLinear(c.rgb), uLinearPreviewGamma);
	c.xyz = mix(c.xyz, c.xxx, uGray);
	
	//handle single-component viewing
	if(uColor.r + uColor.g + uColor.b == 1.0)
	{ c.rgb = c.rgb + c.gbr + c.brg; }
	if(uColor.r + uColor.g + uColor.b == 0.0 && uColor.a > 0.0)
	{ c = vec4(c.a, c.a, c.a, 1.0); }
#ifdef GAMMA_ADJUSTMENT
	c.xyz = pow( c.xyz, uGammaAdjust );
#endif

	OUT_COLOR0 = c;
}
