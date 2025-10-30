uniform float usRGB;
uniform float uGrayAlpha;	//use G channel as alpha
uniform float uGray;		//use R channel for RGB
uniform vec4  uColor;
uniform float uSampleRRRA;	//different swizzle for RG textures

uniform float uGammaAdjust;
uniform float uLowThreshold;
uniform float uHighThreshold;
uniform float uLinearPreviewGamma;

uniform int4 uSwizzle;

USE_TEXTURE2D_NOSAMPLER(tTexture);
USE_TEXTURE2D(tColorMap);
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

#if DEBUG_MODE == 1
#include "../paint/layer/gbufferflags.sh"
#endif

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS {
	vec4 c = textureWithSampler( tTexture, uSampler, fTexCoord );

	vec4 temp = c;
	c = vec4( temp[uSwizzle.x], temp[uSwizzle.y], temp[uSwizzle.z], temp[uSwizzle.w]);

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
	
	//gradientmapping?
	c.xyz = pow( c.xyz, uGammaAdjust );
	float mapR = texture2D(tColorMap, vec2(c.r, 0.5)).r;
	float mapG = texture2D(tColorMap, vec2(c.g, 0.5)).g;
	float mapB = texture2D(tColorMap, vec2(c.b, 0.5)).b;
	c.xyz = vec3(mapR, mapG, mapB);

#if DEBUG_MODE == 1
	int flags = int(ceil(textureWithSampler( tTexture, uSampler, fTexCoord ).x * 255.0));
	c.rgb = vec3( 0.0, 0.0, 0.0 );
	if( flags & GBUFFER_FLAGS_GEOMETRY )
	{
		c.rgb += vec3( 0.5, 0, 0 );
	}

	if( flags & GBUFFER_FLAGS_RASTER_PIXEL )
	{
		c.rgb += vec3( 0, 0.5, 0 );
	}

	if( flags & GBUFFER_FLAGS_ISLAND_PIXEL )
	{
		c.rgb += vec3( 0, 0, 1.0 );
	}

	if( flags & GBUFFER_FLAGS_SKIRT_PIXEL )
	{
		c.rgb += vec3( 0.5, 0.5, 0.0 ); 
	}

		if( flags & GBUFFER_FLAGS_HEM_PIXEL )
	{
		c.rgb += vec3( 0.5, 0.5, 0.5 ); 
	}

	if( flags & GBUFFER_FLAGS_DEAD_PIXEL )
	{
		c.rgb = vec3( 0, 0, 0 );
	}
#endif

	OUT_COLOR0 = c;
}
