#include "data/shader/mat/other/scatterUtil.sh"

USE_TEXTURE2D(tLightTex);
USE_TEXTURE2D(tColorTex);
USE_TEXTURE2D(tDirTex);
USE_TEXTURE2D(tNoise);
USE_TEXTURE2D(tNormalTex);

uniform vec2	uSampleAspect;
uniform vec2	uBlurPolarity;
uniform float	uMillimeterScale;
uniform vec4	uNoiseScaleBias;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{	
	//Radial Spread - Distance from the mean, the center of our gaussian curve. Defines how far out from the center of the bell curve our samples reach.
	//Should be a multiple of the standard deviation (sigma), somewhere between 1.5 and 3. Since max sigma is almost always 1.0, spread is a constant.
	#define R_SPREAD 1.75
	
	//This many scatter samples lie to each side of the center sample
	#define SAMPLE_HALF 6
	#define SAMPLE_HALF_F 6.0
	#define SAMPLE_HALF_INV (1.0/SAMPLE_HALF_F)

	//2x scatter samples + center sample
	#define SAMPLE_COUNT ((2.0 * SAMPLE_HALF_F) + 1.0)

	//Total range of integral, including little extra slivers the midpoint rule adds to each end of R_SPREAD
	#define INTEGRAL_SPREAD (2.0 * ((R_SPREAD/SAMPLE_HALF_F) + R_SPREAD))

	vec4 lightTap = texture2D(tLightTex, fCoord);
	vec4 colorTap = texture2D(tColorTex, fCoord);
	vec4 dirTap =   texture2D(tDirTex, fCoord);

	//decode normal
	vec3 normal = texture2DLod(tNormalTex, fCoord, 0.0).xyz;
	
	//decode dithered noise
	vec2 noise_uv = (fCoord * uNoiseScaleBias.xy) + uNoiseScaleBias.zw;
	vec4 noise = texture2DLod( tNoise, noise_uv, 0.0 );
	noise.xy = (2.0*noise.xy) + vec2(-1.0,-1.0);

	//decode uv spread
	#define UV_LIMIT_DECODE 0.25
	vec3 uvSpread = dirTap.xyz * dirTap.xyz * UV_LIMIT_DECODE;
			
	//trig for skewing our UV samples along the grazing angles of our surface instead of strictly a screenspace sphere of samples.
	vec2 slopeBias = sqrt(vec2(1.0,1.0) - (normal.xy*normal.xy)); 
		
	vec4 dir;
	dir.xy = uvSpread.xy;
	dir.xy *= noise.xy;
	dir.zw = vec2(-dir.y, dir.x); //zw is orthogonal to xy
	dir.xy = (uBlurPolarity.x * dir.xy) + (uBlurPolarity.y * dir.zw);
	dir.xy *= uSampleAspect;
	dir.xy *= slopeBias;
	
	vec3 subdermisColor = colorTap.rgb;
	float scatterMask = colorTap.a;	

	//2-gaussian approximation of scattering response from Activision paper
	//Scattering response is a complex curve based on multiple layers of tissue and fat.
	//Nvidia approximates it with the sum of 6 gaussian terms.
	//Activision method uses two hand-tuned gaussian approximations.
	#define CLOSEFIT 0
	#define ACTIVISION 0
	#define MARMOSET 1
	
	//s - sigma - Standard deviation, defines blurriness of gaussian curve. 
	//Subdermis spectrum defines scattering blurriness at each wavelength, as sampled at R, G, and B.
	#if MARMOSET
		subdermisColor = max(vec3(0.05,0.05,0.05), subdermisColor);	//divide by zero catch
		vec3 s_near = subdermisColor * vec3(0.25, 0.2667, 0.4); //approximate the magic number relationship between activision near/far		
		vec3 s_far = subdermisColor;
		float s_weight = 0.6;
	#elif ACTIVISION
		vec3 s_near = vec3(0.25, 0.08, 0.02);
		vec3 s_far = vec3(1.0, 0.3, 0.05);
		float s_weight = 0.6;
	#else //Close-fit
		vec3 s_near = vec3(0.034, 0.029, 0.016);
		vec3 s_far = vec3(1.0, 0.48, 0.2);
		float s_weight = 0.37;
	#endif
	
	//NOTE: activision's magic numbers are variances, we need sigma = sqrt(v)
	vec3 GN_near = gaussianNorm3(sqrt(s_near));
	vec3 GN_far =  gaussianNorm3(sqrt(s_far));
	vec3 GP_near = gaussianPower3(s_near);
	vec3 GP_far =  gaussianPower3(s_far);
	
	//Center sample
	vec4 center = lightTap;	
	vec4 sum = center;
	vec3 G_center = lerp( GN_near, GN_far, s_weight );	//radius of 0 simplifies to just the GN term
	sum.rgb *= G_center * 0.2;	//technically the center sample has zero-width importance but lets give it a lil' bit.

	float r_scale = max(s_far.r, max(s_far.g, s_far.b));
	float r_spread = R_SPREAD * r_scale;
	
	HINT_UNROLL
	for(int side=-1; side<=1; side +=2)
	{
		HINT_UNROLL
		for(int i=1; i<=SAMPLE_HALF; ++i)
		{	
			float t = float(i) * SAMPLE_HALF_INV;
			float sqrt_t = sqrt(t);
			float r = t*sqrt_t*r_spread;
			float ddt = 1.5*sqrt_t;
			vec2 uv = ((float(side) * r) * dir.xy) + fCoord;
			vec4 tap = texture2D(tLightTex, uv);			
			float dz = abs(tap.a - center.a);
			//sharp curve on dz to build a mask
			dz *= dz;
			dz *= dz;
			dz *= dz;

			//scaling dz by projected spread depth seems to rid us of all depth-related illnesses
			dz *= uvSpread.z;
			float mask = 1.0 - min(dz,1.0);
			
			float r2 = r*r;
			vec3 G = lerp(
				GN_far * gaussianCached3(GP_far, r2),
				GN_near * gaussianCached3(GP_near, r2),
				s_weight
			);

			tap.rgb = lerp(center.rgb, tap.rgb, mask);
			sum.rgb = sum.rgb + ((tap.rgb * G) * ddt);
		}
	}

	//Multiply sum by the width of our total integral range, then divide by number of samples (2*SAMPLE_HALF + 1)
	sum.rgb *= (INTEGRAL_SPREAD / SAMPLE_COUNT) * r_scale;
	OUT_COLOR0.rgb = lerp(center.rgb, sum.rgb, scatterMask);
	OUT_COLOR0.a = lightTap.a;
}
