#ifndef COLORSPACERECOLOR_SH
#define COLORSPACERECOLOR_SH

#define MODE_DIFF_COLOR_HSV				0	
#define MODE_DIFF_COLOR_MODIFIED_HSV	1	
#define MODE_DIFF_COLOR_HSV_V			2

#define	PI								3.14159265359
#define SAT_EPSILON						0.0001
#define VAL_EPSILON						0.0001
#define SORT_MEAN_THRESHOLD				10.0

#define MAX_INFLUENCE_RADIUS			0.09
#define MIN_INFLUENCE_RADIUS			0.06
#define GRAYSCALE_INFLUENCE_RADIUS		0.06
#define	CUSTOM_INFLUENCE_RADIUS			0.02

#define MAX_DIFF_DIST					2.f

#define TOLERANCE_FACTOR				0.4f
#define CUSTOM_FACTOR					((MAX_INFLUENCE_RADIUS * MAX_DIFF_DIST + 1.f * TOLERANCE_FACTOR) / (CUSTOM_INFLUENCE_RADIUS + 1.f * TOLERANCE_FACTOR))

#define SQRT3DIV						0.577350269f	// 1.f / sqrt(3.f)

#define DIST_SIGMA						0.1f
#define DIST_SIGMA_COEFF				-50.f			// -1.f / (2.f * DIST_SIGMA * DIST_SIGMA)


// --------------------------------------------------------------------------------------------------------
vec3	RGBtoHSV( vec3 rgb, inout float mn, inout float chroma )
{
	float r = rgb.r, g = rgb.g, b = rgb.b;

	mn = min( min( r, g ), b );
	float mx = max( max( r, g ), b );
	chroma = mx - mn;

	float h=0.0, s=0.0;
	// Impossible to apply contrast on a perfect black color
	float v = max(mx, VAL_EPSILON);
	HINT_FLATTEN
	if( chroma != 0.0 )
	{
		float invChroma = rcp(chroma);
		HINT_FLATTEN
		if( r == mx )
		{
			h = (g - b) * invChroma;
			h = h < 0.0 ? (h + 6.0) : h;
		}
		else if( g == mx )
		{
			h = (b - r) * invChroma + 2.0;
		}
		else
		{
			h = (r - g) * invChroma + 4.0;
		}
		h /= 3.f; // [0-6] -> [0-2]
		s = chroma / mx;
	}

	return vec3( h, s, v );
}

// --------------------------------------------------------------------------------------------------------
vec3	RGBtoHSV( vec3 rgb )
{
	float mn, chroma;
	return RGBtoHSV( rgb, mn, chroma );
}

// --------------------------------------------------------------------------------------------------------
vec3	RGBtoHSVAndRGB_H( vec3 rgb, inout vec3 rgb_H)
{
	float mn, chroma;
	vec3 hsv = RGBtoHSV( rgb, mn, chroma );

	// Compute a RGB only based on the Hue, aka we "remove" the Saturation and Value influence,
	// In order to be able to modify later S and V and recompute inexpensively the final RGB from rgb_H / new S / new V
	rgb_H = 0.f; 
	if( chroma != 0.0 )
	{
		rgb_H = (rgb - mn) / chroma;
	}

	return hsv;
}

// --------------------------------------------------------------------------------------------------------
vec3 computePartialRGBFromH(float h)
{
	h = fmod(fmod(h, 2.f) + 2.f, 2.f); 	//ensure hue is [0-2]

	float hh = h * 3.f; // [0-6]
	float x = (1.f - abs(fmod(hh, 2.f) - 1.f));
	vec3 partialRGBColor;
	partialRGBColor.x = (hh < 1.0 || hh >= 5.f) ? 1.f :
		(hh < 2.f || hh >= 4.f) ? x :
		0.f;
	partialRGBColor.y = (hh < 4.f) ?
		((hh >= 1.f && hh < 3.f) ? 1.f : x) :
		0.f;
	partialRGBColor.z = (hh >= 2.f) ?
		((hh >= 3.f && hh < 5.f) ? 1.f : x) :
		0.f;

	return partialRGBColor;
};

// --------------------------------------------------------------------------------------------------------
vec3	finalizeRGBWithSV( vec3 rgb, float s, float v )
{
	// Saturation / Value
	float chroma = v * s;
	float mn = v - chroma;
	return rgb*chroma + mn;
}

// --------------------------------------------------------------------------------------------------------
vec3	HSVtoRGB( vec3 hsv )
{
	// Hue
	vec3 partialRGBColor = computePartialRGBFromH(hsv.x);

	// Saturation / Value
	return finalizeRGBWithSV( partialRGBColor, hsv.y, hsv.z );
}

// --------------------------------------------------------------------------------------------------------
float gaussianDistribution(float sigma, float x)
{
	float mu = 1.0;

	return exp( -pow(x-mu, 2) / (2.0*pow(sigma, 2))) / (sigma*sqrt(2.0*PI));
}

// --------------------------------------------------------------------------------------------------------
float normalizedGaussianDistribution(float sigma, float x)
{
	return gaussianDistribution(sigma, x) / gaussianDistribution(sigma, 1.0);
}

// --------------------------------------------------------------------------------------------------------
float computeColorInfluenceThreshold(vec3 hsv)
{
	#ifdef IS_GRAYSCALE
		return GRAYSCALE_INFLUENCE_RADIUS;
	#else
		// the more "vibrant" is the color, the smaller must be the threshold
		return lerp(MAX_INFLUENCE_RADIUS, MIN_INFLUENCE_RADIUS, hsv.y*hsv.z);
	#endif
}

// --------------------------------------------------------------------------------------------------------
#define DARK_GREY_SIGMA_S				0.1
#define DARK_GREY_SIGMA_V				0.02

#define DARK_GREY_S_COEFF				-50.f		// 1.f / (2.f*pow(DARK_GREY_SIGMA_S, 2)))
#define DARK_GREY_V_COEFF				-1250.f		// 1.f / (2.f*pow(DARK_GREY_SIGMA_V, 2)))

vec2 fixDarkGreyColor(vec3 meanHSV, vec3 meanPartialRGB, inout vec3 hsv, inout vec3 rgb)
{
	// *** Initial code ***
	// vec3 recolorHMean_HSV = { meanHSV.x, max(hsv.y, SAT_EPSILON), hsv.z };
	// vec3 recolorHMean_RGB = HSVtoRGB(recolorHMean_HSV);

	// According to some extreme textures for dark and very light colors, 
	// We should not go higher than DARK_GREY_SIGMA_V for V, otherwise, the dark grays change too much in color (losing too much of their color in favor of Mean).
	// But we should not go below DARK_GREY_SIGMA_S for S, otherwise, the whites are not "gathered" enough.

	// *** Optimized code ***
	vec3 recolorHMean_RGB = finalizeRGBWithSV(meanPartialRGB, max(hsv.y, SAT_EPSILON), hsv.z);

	// *** Initial code *** 
	// float gaussS = normalizedGaussianDistribution(DARK_GREY_SIGMA_S, 1.f - hsv.y);
	// float gaussV = normalizedGaussianDistribution(DARK_GREY_SIGMA_V, 1.f - hsv.z);
	//
	// *** Optimized code ***
	float gaussS = exp( hsv.y * hsv.y * DARK_GREY_S_COEFF); 
	float gaussV = exp( hsv.z * hsv.z * DARK_GREY_V_COEFF);

	// *************** Fix Hue / lerp on RGB
	rgb = lerp(rgb, recolorHMean_RGB, gaussS);
	rgb = lerp(rgb, recolorHMean_RGB, gaussV);

	// Initial code : 
	// hsv = RGBtoHSV(rgb);
	// hsv.y = lerp(hsv.y, meanHSV.y, gaussV);
	// rgb = HSVtoRGB(hsv);

	// Optimized code :

	// Update HSV
	vec3 rgb_H = 0.f; 
	hsv = RGBtoHSVAndRGB_H( rgb, rgb_H);

	// *************** Fix Saturation
	hsv.y = lerp(hsv.y, meanHSV.y, gaussV);

	// Update RGB
	rgb = finalizeRGBWithSV( rgb_H, hsv.y, hsv.z );

	// For debug output
	return vec2(gaussS, gaussV);
}

// --------------------------------------------------------------------------------------------------------
float computeGrayscaleDistance(vec3 hsv, vec3 refColorHSV)
{
	// we only consider V
	return abs(hsv.z - refColorHSV.z);
}

// --------------------------------------------------------------------------------------------------------
// Here we need a symmetry : computeHistoGroupDistance(c1, c2) == computeHistoGroupDistance(c2, c1)
float computeHistoGroupDistance(vec3 hsv, vec3 refColorHSV)
{
	#ifdef IS_GRAYSCALE
	{
		return computeGrayscaleDistance(hsv, refColorHSV);   
	}
	#else
	{
		vec3 diff = abs(hsv - refColorHSV);
		diff.x = min(diff.x, 2.0 - diff.x);
		vec3 squareDiff = diff*diff;

		// When dealing with shades of gray/white/black (low S or V), we want to reduce the "weight" of Hue difference in the final distance computation

		// *** Initial code ***
		// float modulateHue	 = (1.0 - normalizedGaussianDistribution(DIST_SIGMA, hsv.y + 1.0));
		// modulateHue			*= (1.0 - normalizedGaussianDistribution(DIST_SIGMA, hsv.z + 1.0));
		// modulateHue			*= (1.0 - normalizedGaussianDistribution(DIST_SIGMA, refColorHSV.y + 1.0));
		// modulateHue			*= (1.0 - normalizedGaussianDistribution(DIST_SIGMA, refColorHSV.z + 1.0));
		// When the Hue is very similar for both colors, we want to reduce the "weight" of S and V differences in the final distance computation.
		// float modulateSatAndV = lerp( 0.25, 1.0, 1.0 - normalizedGaussianDistribution(DIST_SIGMA, squareDiff.x + 1.0));
		//
		// *** Optimized code ***
		float modulateHue		 = 1.f - exp(DIST_SIGMA_COEFF * hsv.y * hsv.y);
		modulateHue				*= 1.f - exp(DIST_SIGMA_COEFF * hsv.z * hsv.z);
		modulateHue				*= 1.f - exp(DIST_SIGMA_COEFF * refColorHSV.y * refColorHSV.y);
		modulateHue				*= 1.f - exp(DIST_SIGMA_COEFF * refColorHSV.z * refColorHSV.z);
		float modulateSatAndV	= lerp( 0.25, 1.0, 1.0 - exp(DIST_SIGMA_COEFF * squareDiff.x * squareDiff.x));

		// But when dealing with shades of gray, we must still take in consideration S and V differences : modulateSatAndV should stay at 1.f
		// So we apply these lerp, as in this case modulateHue is close to 0 :
		modulateSatAndV = lerp(1.0, modulateSatAndV, modulateHue);

		// We want to exaggerate the distance on Hue because it's very important here for grouping (or not)
		squareDiff.x = diff.x; //(equivalent pow 0.5)

		return sqrt(squareDiff.x * modulateHue + squareDiff.y * modulateSatAndV + squareDiff.z * modulateSatAndV) * SQRT3DIV;
	}
	#endif
}

// --------------------------------------------------------------------------------------------------------
float computeLinearDistanceHSV(vec3 hsv, vec3 refColorHSV)
{
	#ifdef IS_GRAYSCALE
	{
		return computeGrayscaleDistance(hsv, refColorHSV);   
	}
	#else
	{
		vec3 diff = abs(hsv - refColorHSV);
		diff.x =  min(diff.x, 2.f - diff.x);
		vec3 squareDiff = diff*diff;

		#ifdef IS_COLOR_LIST
		{
			return sqrt(dot(squareDiff, vec3(1,1,1))) * SQRT3DIV;
		}
		#else
		{
			float modulateHue = hsv.y * hsv.z;

			// We want to take into account the fact that when V is almost 0, the S can have any possible value, we still get a dark / almost black color.

			// *** Initial code ***
			// float modulateSat = (1.f - normalizedGaussianDistribution(DIST_SIGMA, refColorHSV.z + 1.0));
			// If almost no Hue difference, we dont want to take into account the V difference. AO, shadow...
			// float modulateV = 1.0 - normalizedGaussianDistribution(DIST_SIGMA, squareDiff.x + 1.0);
			//
			// *** Optimized code ***
			float modulateSat	= 1.f - exp(DIST_SIGMA_COEFF * refColorHSV.z * refColorHSV.z);
			float modulateV		= 1.f - exp(DIST_SIGMA_COEFF * squareDiff.x * squareDiff.x);

			return sqrt(squareDiff.x * modulateHue + squareDiff.y * modulateSat + squareDiff.z * modulateV) * SQRT3DIV;	
		}
		#endif
	}
	#endif
}

#endif //COLORSPACERECOLOR_SH
