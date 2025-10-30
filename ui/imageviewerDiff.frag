uniform float usRGB;
uniform float uGrayAlpha;	//use G channel as alpha
uniform float uGray;		//use R channel for RGB
uniform vec4  uColor;
uniform float uSampleRRRA;	//different swizzle for RG textures
uniform float uVPOverlayMode;	//used for generating a texture that will be overlaid on the main viewport
uniform float uGammaAdjust;
uniform float uLowThreshold;
uniform float uHighThreshold;
uniform float uLinearPreviewGamma;
uniform float uDiffThreshold;
uniform int   uDiffMode;

USE_TEXTURE2D_NOSAMPLER(tTexture);
USE_TEXTURE2D_NOSAMPLER(tRef);
USE_TEXTURE2D(tThermal);
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

vec4 processColor(vec4 c)
{
//	c = mix(c, c.rrra, saturate(uSampleRRRA));
	c *= uColor * uColor;

	c.a = mix(c.a, c.g, uGrayAlpha);
	c.rgb = mix( c.rgb, sRGBToLinear(c.rgb), uLinearPreviewGamma);
	c.xyz = mix(c.xyz, c.xxx, uGray);
	
	//handle single-component viewing
	if(uColor.r + uColor.g + uColor.b == 1.0)
	{ c.rgb = c.rgb + c.gbr + c.brg; }
	if(uColor.r + uColor.g + uColor.b == 0.0 && uColor.a > 0.0)
	{ c = vec4(c.a, c.a, c.a, 1.0); }
	
	
	if(abs(uLowThreshold-uHighThreshold) > 0.001)
	{ c.rgb = saturate((c.rgb - uLowThreshold) / (uHighThreshold-uLowThreshold)); }
	
	c.xyz = pow( c.xyz, uGammaAdjust );
	return c;
}

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS {
	vec2 texCoord = mix(fTexCoord, vec2(fTexCoord.x, 1.0-fTexCoord.y), uVPOverlayMode);
	vec4 c1 = processColor(textureWithSampler( tTexture, uSampler, texCoord ));
	vec4 c2 = processColor(textureWithSampler( tRef, uSampler, texCoord ));
	
	float diffVal = length(c1.rgb-c2.rgb) / max(uDiffThreshold, 0.001);		//basic difference quantity
	if(uDiffMode == 1)	//threshold
	{
		//take the average color and partly gray it out, then highlight differences
		vec3 avg = c1.rgb * 0.5 + c2.rgb * 0.5;
		float gray = (avg.r + avg.b + avg.g) * 0.333;
		avg = mix(avg, vec3(gray, gray, gray), 0.5);
		float a = mix(1.0, 0.0, uVPOverlayMode);
		if(diffVal > 1.0)
		{
			avg = vec3(1.0, 0.0, 0.0);
			a = 1.0;
		}
		OUT_COLOR0 = vec4(avg, a);
	}
	else if(uDiffMode == 2)	//thermal
	{
		OUT_COLOR0 = texture2D(tThermal, vec2(saturate(diffVal), 0.5));
		OUT_COLOR0.a = mix(OUT_COLOR0.a, step(0.05, diffVal), uVPOverlayMode);	//for VP overlay alpha testing
	}
	else if(uDiffMode == 3) //wipe
	{
		//for the wipe diff, undo the exponent that's applied to our UI slider
		float wipeAmount = pow(uDiffThreshold, 1.0 / 1.75);
		OUT_COLOR0 = mix(c2, c1, step(wipeAmount, fTexCoord.r ));
	}
	else //basic diff
	{
		OUT_COLOR0 = vec4(diffVal, diffVal, diffVal, 1.0);
		
		//give the viewport overlay a bit of a darker edge here for contrast
		float overlayBlacken = 0.2;
		OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb, saturate(OUT_COLOR0.rgb - overlayBlacken) / (1.0-overlayBlacken), uVPOverlayMode);
		OUT_COLOR0.a = mix(OUT_COLOR0.a, step(0.05, diffVal), uVPOverlayMode);	//for VP overlay alpha testing
	}
	
}
