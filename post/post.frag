#include "../common/util.sh"

USE_TEXTURE2D(tInput);
USE_TEXTURE2D(tBloom);
USE_TEXTURE2D(tCurves);

uniform	vec3	uScale;
uniform vec3	uBias;
uniform vec3	uSaturation;
uniform vec3	uBloomColor;
uniform vec3	uSharpness;		// { sharpness, sharpness/4, sharpnessLimit }
uniform vec4	uSharpenKernel;
uniform vec4	uVignetteAspect;
uniform vec4	uVignette;
uniform vec4	uDistortionAmount;
uniform uint	uForceAlphaToOne;
uniform float	uHighlights;
uniform float	uHighlightsExp2;
uniform float	uShadows;
uniform float	uMidtones;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	INPUT1(vec2,fInCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//rgba base input, may be distorted
	vec4 c;
	vec2 inCoord = fInCoord;
	#ifdef DISTORTION
	{
		vec2 U = fCoord * 2.0 - vec2(1.0,1.0);
		vec2 U2 = inCoord * 2.0 - vec2(1.0,1.0);

		//barrel/pincushion distortion
		float radiusSquared = dot(U,U);
		vec2 D = U2 * (1.0 - uDistortionAmount.w * radiusSquared);

		//faux zoom to hide edges
		D /= (1.0 - 2.0*min(uDistortionAmount.w,0.0));

		inCoord = 0.5*D + vec2(0.5,0.5);
		vec2 aberrationDir = fCoord - vec2(0.5,0.5);

		c =   texture2D( tInput, inCoord + uDistortionAmount.x * aberrationDir );
		c.y = texture2D( tInput, inCoord + uDistortionAmount.y * aberrationDir ).y;
		c.z = texture2D( tInput, inCoord + uDistortionAmount.z * aberrationDir ).z;
	}
	#else
		c = texture2D( tInput, inCoord );
	#endif
	c.a = uForceAlphaToOne ? 1.0 : c.a;

	//sharpen filter
	#ifdef SHARPEN
	{
		#ifdef DISTORTION
			vec3 sampleCenter = texture2D( tInput, inCoord ).xyz;
		#else
			vec3 sampleCenter = c.xyz;
		#endif

		vec3
		samples	 = texture2D( tInput, inCoord + uSharpenKernel.xy ).xyz;
		samples	+= texture2D( tInput, inCoord - uSharpenKernel.xy ).xyz;
		samples	+= texture2D( tInput, inCoord + uSharpenKernel.zw ).xyz;
		samples	+= texture2D( tInput, inCoord - uSharpenKernel.zw ).xyz;

		vec3 delta = uSharpness.x*sampleCenter - uSharpness.y*samples;
		c.xyz += clamp( delta, -uSharpness.z, uSharpness.z );
		c.xyz = max(c.xyz, float3(0.0, 0.0, 0.0));
	}
	#endif

	//bloom
	#ifdef BLOOM
		c.xyz += uBloomColor * texture2D( tBloom, inCoord ).xyz;
	#endif
	
	//vignette
	vec2 vdist = fCoord*uVignetteAspect.xy - uVignetteAspect.zw;
	vec3 v = saturate( vec3(1.0,1.0,1.0) - uVignette.xyz*dot(vdist,vdist) );
	vec3 v3 = v*v; v3 *= v;
	c.xyz *= mix( v, v3, uVignette.w );

	//Shadows/Midtones/Highlights
	#ifdef HIGHLIGHTS_SHADOWS
	{
		// Shadows
		const float m = 0.18f;
		float3 w0 = 1.0 - smoothstep(0.0, m, c.rgb);
		float3 w1 = 1.0 - w0;
		float3 T = m * pow(c.rgb * (1.0/m), uShadows);
		float3 L = c.rgb;
		c.rgb = T * w0 + L * w1;
	
		// Midtones
		c.rgb = pow(c.rgb, uMidtones);
	
		// Highlights
		float l = luminance( c.rgb );
		float n = l * ( uHighlightsExp2 + ( l * pow(uHighlights, -8.0f) ) );
		float d = uHighlightsExp2 + l;
		float Lout = n/d;
		c.rgb = c.rgb / l * Lout;
		c.rgb = max(c.rgb, float3(0.0f, 0.0f, 0.0f));
	}
	#endif

	//saturation
	float gray = dot( c.xyz, vec3(0.3,0.59,0.11) );
	c.xyz = mix( vec3(gray,gray,gray), c.xyz, uSaturation );

	//contrast
	c.xyz = c.xyz * uScale + uBias;

	//tone mapping
	#ifdef ToneMap
		c.xyz = ToneMap( c.xyz );
	#endif

	//dithering
	#ifdef Dither
		c.xyz = Dither(c.xyz, uint2(IN_POSITION.xy));
	#endif

	//film grain
	#ifdef FilmGrain
		c.xyz = FilmGrain( c.xyz, IN_POSITION.xy );
	#endif

	//color curves
	#ifdef CURVES
		vec3 curveCoord = (255.0/256.0)*c.xyz + vec3(0.5/256.0, 0.5/256.0, 0.5/256.0);
		c.x = texture2D( tCurves, curveCoord.xx ).x;
		c.y = texture2D( tCurves, curveCoord.yy ).y;
		c.z = texture2D( tCurves, curveCoord.zz ).z;
	#endif

	OUT_COLOR0 = c;
}
