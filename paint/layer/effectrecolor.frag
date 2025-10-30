#include "effect.frag"
#include "gbufferutils.sh"
#include "../../common/colorspacerecolor.sh"
#include "layer.sh"
#include "layerformat.sh"
#include "../../common/commonrecolor.sh"

USE_TEXTURE2D( tTexture );


uniform vec3	uMarginBorder;
uniform uint	uHueRecolor;

//#define DISPLAY_DEBUG

#ifdef DISPLAY_DEBUG
uniform uint	uDebugMode;
#endif

USE_STRUCTUREDBUFFER(PixelShaderGlobalData, bOutputGlobal);
USE_STRUCTUREDBUFFER(PixelShaderColorData, bOutputColors);

// --------------------------------------------------------------------------------
float normalizedLocalModeGaussianDistribution(float gaussianParam, float linearDistance)
{
	float x = 1.0 + 0.9 * saturate(linearDistance);
	x = pow(x, 6);

	// Initial code :
	// return normalizedGaussianDistribution(sigma, x);

	// Optimized code :
	float mu = 1.0;
	return exp( -pow(x-mu, 2) * gaussianParam);
}

// --------------------------------------------------------------------------------
float getMainColorsRecolorFactor(float gaussianParam, float linearDistance)
{
	return smoothstep(gaussianParam, gaussianParam*0.5f + 0.5f, 1.f - linearDistance);
}

// --------------------------------------------------------------------------------
vec4 getSample(vec2 uv)
{
	if( !isInUVIslandFromFCoords(uv) )
	{ return 0.f; }

	vec4 sample = texture2DLod( tTexture, uv, 0.0 );

	#ifdef IS_GRAYSCALE
		sample.rgb = sample.rrr;
	#endif

	if( bOutputGlobal[0].mAllDiscard > 0.5f )
	{ return sample; }

	// FOR DEBUG OUTPUT
#ifdef DISPLAY_DEBUG
	vec4 initialColor = sample;
	vec3 beforeSV = 0.0;
	vec3 hsvBeforeV = 0.0;
	
	vec3 initialHSV = 0;
	vec3 afterDarkGrayFixHSV = 0;
	float fixDarkGreyDist = 0.0;
	float fixDarkGrayFactor = 0.0;
	float linearDistanceNotNorm = 0.0;
	float recolorFactorSum = 0.0;

	float linearDistance = 0.0;
	float recolorFactor = 0.0;
#endif

	// ********** TEINTE les DARK GREY vers MEAN **********
	vec3 hsv = RGBtoHSV( sample.rgb );

	#ifdef DISPLAY_DEBUG
		initialHSV		= hsv;
	#endif

	// We need to compensate the histogram imprecision at S and V borders (related to the resolution)
	if( uHueRecolor )
	{ hsv.yz = clamp(hsv.yz, uMarginBorder.yz, 1.0 - uMarginBorder.yz); }

	#ifndef IS_GRAYSCALE
	#ifndef IS_GLOBAL
	{
        vec3 rgb = sample.rgb;
		#ifdef DISPLAY_DEBUG
		vec2 debugOutput = 
		#endif
        fixDarkGreyColor(bOutputGlobal[0].mRefColorHSV, bOutputGlobal[0].mRefColorPartialRGB, hsv, rgb);
        sample.rgb = rgb;
				
		#ifdef DISPLAY_DEBUG
			fixDarkGreyDist = debugOutput.x;
			fixDarkGrayFactor = debugOutput.y;
		#endif
	}
	#endif
	#endif

	#ifdef DISPLAY_DEBUG
		afterDarkGrayFixHSV = hsv;
	#endif
		
	// ****************************************************

	float saturationDiff = 0.0;
	float valueFactor = 1.0;
	#ifdef IS_GRAYSCALE
		valueFactor = 0.f;
	#endif

	// We cannot have a completely gray color (Saturation == 0), we must absolutely keep the hue information.
	// If we keep Saturation == 0, Hue is set to 0 (red). So, we must force a minimum saturation.
	float satNo0 = max(hsv.y, SAT_EPSILON);
	float valueDiv = 1.f / max(hsv.z, VAL_EPSILON);

	for( int colorId=0; colorId<MAIN_COLORS_COUNT; ++colorId )
	{
		#ifndef DISPLAY_DEBUG
		float linearDistance = 0.f;
		float recolorFactor = 0.f;
		#endif

		// ********************** HUE **********************
		#ifdef IS_GLOBAL
		{
			recolorFactor = 1.0;
		}
		#else
		{
			vec4 mainColorHSVAndCurve = bOutputColors[colorId].mRefHSVAndCurveParam;

			// Compute linear distance
			// Important : we must compute the distance relative to the INITIAL hsv color value (the color value we get after fixDarkGreyColor)
			linearDistance = computeLinearDistanceHSV(hsv, mainColorHSVAndCurve.xyz);

			#ifdef DISPLAY_DEBUG
				linearDistanceNotNorm = linearDistance; 
			#endif

			// In the case of the Multiple / Custom Colors mode, we don't want the same curve as in the Primary Color mode. 
			// We want a plateau at the top of the bell curve / on sigma.
			// We want sigma == threshold == radius of influence sphere for each main color. 
			// And we MUST NOT normalize the distance.
			float curveParam = mainColorHSVAndCurve.w;
			#ifdef IS_COLOR_LIST
			{
				recolorFactor = getMainColorsRecolorFactor(curveParam, linearDistance);
			}
			#else
			{
				linearDistance = linearDistance * bOutputColors[colorId].mMaxThreshold;
				recolorFactor = normalizedLocalModeGaussianDistribution(curveParam, linearDistance);
			}
			#endif	
		}
		#endif // IS_GLOBAL

		vec4 goalPartialRGBColorsAndDiscard = bOutputColors[colorId].mGoalPartialRGBAndDiscard;

		// No recolorization with this current main color if it is discarded (no target color / hidden / ...)
		recolorFactor *= goalPartialRGBColorsAndDiscard.w;

		#ifdef DISPLAY_DEBUG
			recolorFactorSum += recolorFactor;
		#endif

		vec3 recolorHGoal = finalizeRGBWithSV(goalPartialRGBColorsAndDiscard.rgb, satNo0, hsv.z);

		if( uHueRecolor )
		{ sample.rgb = lerp(sample.rgb, recolorHGoal, recolorFactor); }


		// IMPORTANT : We MUST NOT update hsv in the loop, we want to keep the initial S and V values for the next Hue lerps in in the loop


		// ********************** SATURATION & VALUE **********************
		// Compute how to modulate S and V
		// And also apply the contrast for the current color 

		vec4 SVParams = bOutputColors[colorId].mSVParams;
		#ifdef IS_GRAYSCALE
		{
			valueFactor		= lerp(valueFactor,		SVParams.x * hsv.z + SVParams.y,	recolorFactor);
		}
		#else
		{
			saturationDiff	= lerp(saturationDiff,	SVParams.x * hsv.y + SVParams.y,	recolorFactor);
			valueFactor		= lerp(valueFactor,		SVParams.z * valueDiv + SVParams.w, recolorFactor);
		}
		#endif
	}

	// ********************** SATURATION & VALUE **********************
	vec3 rgb_H = 0.f; 
	hsv = RGBtoHSVAndRGB_H( sample.rgb, rgb_H);

	// ********** SATURATION **********
	#ifdef DISPLAY_DEBUG
		beforeSV = sample.rgb;
	#endif

	hsv.y = saturate(hsv.y + saturationDiff); 

	// ********** VALUE **********
	#ifdef DISPLAY_DEBUG
		hsvBeforeV = hsv;
	#endif

	#ifdef IS_GRAYSCALE
	{
		hsv.z = saturate(hsv.z + valueFactor); 
	}
	#else
	{
		hsv.z = saturate(hsv.z * valueFactor);
	}
	#endif
	
	sample.rgb = finalizeRGBWithSV( rgb_H, hsv.y, hsv.z );

	#if !defined( IS_COLOR_LIST ) && ( defined( IS_GRAYSCALE ) || defined( IS_GLOBAL ) )
	if( bOutputGlobal[0].mInvertGlobalLocal ) 
	{ 
		sample.rgb = invertColorFormatted(sample.rgb);
	}
	#endif

	// ************************************ DEBUG ************************************
	#ifdef DISPLAY_DEBUG
	if( uDebugMode>0 )
	{
		vec3 mainCoverageColors[10] =	{ vec3(1,1,0),		vec3(1,0.5,0),	vec3(1,0,0),	vec3(1,0,1), 
										  vec3(0.5,0,1),	vec3(0,0,1),	vec3(0,1,1),	vec3(0,1,0),
										  vec3(0.5,1,0),	vec3(0,1,0.5)};

		if(uDebugMode==1)		// InitialHue
		{
			vec3 hsv = RGBtoHSV( initialColor.rgb );
			sample.rgb = HSVtoRGB(vec3(hsv.x, 0.8, 0.5));
		}
		else if(uDebugMode==2)	// FixDarkGreyDist
		{
			sample.rgb = fixDarkGreyDist.xxx;
		}
		else if(uDebugMode==3)	// FixDarkGreyFactor
		{
			sample.rgb = fixDarkGrayFactor.xxx;
		}
		else if(uDebugMode==4)	// HueAfterFixDarkGrey
		{
			sample.rgb = HSVtoRGB(vec3(afterDarkGrayFixHSV.x, 0.8, 0.5));
		}
		else if(uDebugMode==5)	// ColorAfterFixDarkGrey
		{
			vec3 afterDarkGrayFixRGB = HSVtoRGB(afterDarkGrayFixHSV);
			sample.rgb = afterDarkGrayFixRGB;
		}
		else if(uDebugMode==6)	// LinearDistanceNotNorm
		{
			sample.rgb = linearDistanceNotNorm;

			//if(linearDistanceNotNorm>0.1)
			//	sample.rgb = vec3(1,0,0);
		}
		else if(uDebugMode==7)	// LinearDistance
		{
			sample.rgb = 1.0 - linearDistance;

			if(linearDistance>1.0)
				sample.rgb = vec3(1,0,0);
		}
		else if(uDebugMode==8)	// RecolorFactor
		{
			sample.rgb = recolorFactorSum;//recolorFactor;
		}
		else if(uDebugMode==9)	// BeforeSV
		{
			sample.rgb = beforeSV;
		}
		else if(uDebugMode==10)	// BeforeV
		{
			sample.rgb = HSVtoRGB(hsvBeforeV);
		}
		else if(uDebugMode==11)	// InitialS
		{
			vec3 hsv = RGBtoHSV( initialColor.rgb );
			sample.rgb = hsv.yyy;
		}
		else if(uDebugMode==12)	// OutputS
		{
			vec3 hsv = RGBtoHSV( sample.rgb );
			sample.rgb = hsv.yyy;
		}
		else if(uDebugMode==13)	// InitialV
		{
			vec3 hsv = RGBtoHSV( initialColor.rgb );
			sample.rgb = hsv.zzz;
		}
		else if(uDebugMode==14)	// OutputV
		{
			vec3 hsv = RGBtoHSV( sample.rgb );
			sample.rgb = hsv.zzz;
		}
		else if(uDebugMode==15 || uDebugMode==16)	// AllMainColors && AllExpandMainColors
		{
			#ifdef IS_COLOR_LIST
			{
				int areasCount = 0;
				int meanArea = 0;
				for( int i=0; i<MAIN_COLORS_COUNT; ++i )
				{
					PixelShaderColorData psColorData = bOutputColors[i];
					vec3 hsvMain		= psColorData.mRefHSVAndCurveParam.xyz;
					float maxThreshold	= psColorData.mMaxThreshold;
					float initThreshold = psColorData.mInitThreshold;
					bool colorFound		= psColorData.mFound > 0.5f;

					float distMain = computeLinearDistanceHSV(afterDarkGrayFixHSV, hsvMain);
					float threshold = uDebugMode==15 ? initThreshold : maxThreshold;
					if( colorFound && distMain <= threshold )
					{
						sample.rgb = mainCoverageColors[i];

						if(i==0) 
							meanArea++;
						else
							areasCount++;
					}
				}

				if( areasCount == 0 && meanArea == 0 )
					sample.rgb = vec3(1,1,1);

				// Some influence areas are intersected
				if( areasCount > 1 )
					sample.rgb = vec3(0,0,0);
			}
			#endif
		}
		else if(uDebugMode==17)	// MinMainColors
		{
			#ifdef IS_COLOR_LIST
			{
				float minDist = 100.0;
				int mainColorId = -1;
				for( int i=0; i<MAIN_COLORS_COUNT; ++i )
				{
					bool colorFound		= bOutputColors[i].mFound > 0.5f;

					if( colorFound==0 )
						continue;

					vec3 hsvMain	= bOutputColors[i].mRefHSVAndCurveParam.xyz;

					float distMain  =  computeLinearDistanceHSV(afterDarkGrayFixHSV, hsvMain);

					if( distMain<minDist )
					{
						minDist = distMain;
						mainColorId = i;
					}
				}

				sample.rgb = vec3(1,1,1);
				if( mainColorId != -1 )
				{
					sample.rgb = mainCoverageColors[mainColorId]; 

					float initThreshold = bOutputColors[mainColorId].mInitThreshold;

					// Too large distance :(
					if( minDist > MAX_DIFF_DIST* initThreshold)
						sample.rgb = vec3(0,0,0);
				}
			}
			#endif
		}
	}
	#endif // DISPLAY_DEBUG

	return sample;
}

// --------------------------------------------------------------------------------

vec4 runEffect( LayerState state )
{
	return getSample( state.bufferCoord );
}

vec4 finalizeEffect( LayerState state, inout float _blendAmount )
{ return state.result; }


