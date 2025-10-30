
#include "quantummultiplication.sh"

#ifndef QC_NO_PIECEWISE
USE_TEXTURE2D(tCurveR);

#ifndef SINGLE_CHANNEL
USE_TEXTURE2D(tCurveG);
USE_TEXTURE2D(tCurveB);
#else
#undef QC_SPLIT_BLUE		//there's no blue split in single channel
#endif
#endif	//QC_NO_PIECEWISE

USE_TEXTURE2D(tInterpolator);
#ifndef MASK_SHADER
#ifndef QC_NO_ZERO
USE_TEXTURE2D(tZero);
#endif

#ifdef USE_SUB_KEYS
USE_TEXTURE2D(tSubBlack);
USE_TEXTURE2D(tSubGrey);
USE_TEXTURE2D(tSubWhite);
#ifdef QC_SPLIT_BLUE
//USE_TEXTURE2D(tSubBlackB);
//USE_TEXTURE2D(tSubGreyB);
//USE_TEXTURE2D(tSubWhiteB);
#endif	//QC_SPLIT_BLUE
#endif //USE_SUB_KEYS

#endif	// !MASK_SHADER

USE_TEXTURE2D(tBlack);
USE_TEXTURE2D(tWhite);
USE_TEXTURE2D(tMask);
//blue channels of our keys
#ifndef SINGLE_CHANNEL
#ifdef QC_SPLIT_BLUE
USE_TEXTURE2D(tBlackB);
USE_TEXTURE2D(tWhiteB);
#ifndef MASK_SHADER
#ifndef QC_NO_ZERO
USE_TEXTURE2D(tZeroB);
#endif

#endif	//!MASK_SHADER


#endif
#endif

uniform vec3 uValue;	//layer substitution value.  unrelated to uValues[].  sorry.  
uniform float uUseValue;
uniform float uNormalization;
uniform float uWatermark;
uniform float uOpacity;
uniform float uValues[6];	//values at which we sampled our truth data

//get the multiplier based on the t-value and all four array indices

#ifndef QC_FOUR_CHANNEL_CURVES
float getValue(float t, float encodedF, float b, float w)
{
	uint encoded = encodeFloat(encodedF, 0, 16);
	int i1, i2, i3, i4;
	
	i1 = extractUint(encoded, 12, 4);
	i2 = extractUint(encoded, 8, 4);
	i3 = extractUint(encoded, 4, 4);
	i4 = extractUint(encoded, 0, 4);
	//figure out which piece of the function we're in
	float part1 = 1.0 - step(uValues[1], t);
	float part2 = step(uValues[1], t) - step(uValues[2], t);
	float part3 = step(uValues[2], t) - step(uValues[3], t);
	float part4 = step(uValues[3], t) - step(uValues[4],t);
	float part5 = step(uValues[4], t);
	
	//all the y-values.  The endpoints values are correct and therefore the coeffients are 0 and 1
	float f0 = 0.0;
	float f5 = 1.0;
	float f1 = getMult(i1);// * (f0 + m * 0.25);
	float f2 = getMult(i2);// * (f0 + m * 0.5);
	float f3 = getMult(i3);// * (f0 + m * 0.75);
	float f4 = getMult(i4);
	float f = mix(f0, f1, (t - uValues[0]) / (uValues[1]-uValues[0]));
	f = mix(f, mix(f1, f2, (t-uValues[1]) / (uValues[2]-uValues[1])), part2);
	f = mix(f, mix(f2, f3, (t-uValues[2]) / (uValues[3]-uValues[2])), part3); 
	f = mix(f, mix(f3, f4, (t-uValues[3]) / (uValues[4]-uValues[3])), part4);
	f = mix(f, mix(f4, f5, (t-uValues[4]) / (uValues[5]-uValues[4])), part5);
	return mix(b, w, f);
//	return getValue(t, i1, i2, i3, i4);
}

vec3 getValues(vec3 tVals, vec3 encodedVals, vec3 black, vec3 white)
{
	float r = getValue(tVals.r, encodedVals.r, black.r, white.r);
	float g = getValue(tVals.g, encodedVals.g, black.g, white.g);
	float b = getValue(tVals.b, encodedVals.b, black.b, white.b);
	return vec3(r, g, b);
}

#else
float getValue(float t, vec4 rgba, float b, float w)
{
	//figure out which piece of the function we're in
	float part1 = 1.0 - step(uValues[1], t);
	float part2 = step(uValues[1], t) - step(uValues[2], t);
	float part3 = step(uValues[2], t) - step(uValues[3], t);
	float part4 = step(uValues[3], t) - step(uValues[4],t);
	float part5 = step(uValues[4], t);
	
	float f0 = b;
	float f5 = w;
	float f1 = rgba.r;
	float f2 = rgba.g;
	float f3 = rgba.b;
	float f4 = rgba.a;
	float f = mix(f0, f1, (t - uValues[0]) / (uValues[1]-uValues[0]));
	f = mix(f, mix(f1, f2, (t-uValues[1]) / (uValues[2]-uValues[1])), part2);
	f = mix(f, mix(f2, f3, (t-uValues[2]) / (uValues[3]-uValues[2])), part3); 
	f = mix(f, mix(f3, f4, (t-uValues[3]) / (uValues[4]-uValues[3])), part4);
	f = mix(f, mix(f4, f5, (t-uValues[4]) / (uValues[5]-uValues[4])), part5);

	return f;
}

vec3 getValues(vec3 tVals, vec4 redCurve, vec4 greenCurve, vec4 blueCurve, vec3 black, vec3 white)
{
	float r = getValue(tVals.r, redCurve, black.r, white.r);
	float g = getValue(tVals.g, greenCurve, black.g, white.g);
	float b = getValue(tVals.b, blueCurve, black.b, white.b);
	return vec3(r, g, b);
}


#endif


//input reading
#ifdef QC_SPLIT_BLUE 
	#define getKey(name, nameB, tc) vec4(texture2D(t##name, tc).rg, texture2D(t##nameB, tc).r, 1.0);
#else
	#define getKey(name, nameB, tc) vec4(texture2D(t##name, tc).rgb, 1.0);
#endif

	#define getZero(tc) getKey(Zero, ZeroB, tc);
	#define getBlack(tc) getKey(Black, BlackB, tc);
	#define getWhite(tc) getKey(White, WhiteB, tc);
	#define getSubBlack(tc) vec4(texture2D(tSubBlack, tc).rgb, 1.0);
	#define getSubGrey(tc) vec4(texture2D(tSubGrey, tc).rgb, 1.0);
	#define getSubWhite(tc) vec4(texture2D(tSubWhite, tc).rgb, 1.0);

#ifdef MASK_SHADER		
	#undef getZero  //no zero for mask shader
	#define getZero(tc) vec4(1.0, 1.0, 0.0, 1.0);
#endif

#ifdef QC_NO_ZERO		
	#undef getZero  //no zero for this mode either
	#define getZero(tc) vec4(1.0, 1.0, 0.0, 1.0);
#endif


//the interpolator is different if we're reading a mask
#ifdef MASK_SHADER
	#define getInterpolator(tc) vec4(mix(texture2D(tInterpolator, tc).rrr*uOpacity, uValue, uUseValue), 1.0)
#else
	#define getInterpolator(tc) mix(texture2D(tInterpolator, tc), vec4(uValue, 1.0), uUseValue);
#endif


//the interpolation process

#ifdef QC_FOUR_CHANNEL_CURVES		//BGRA8 curves
#ifdef SINGLE_CHANNEL
	#define getLerpVals(lv) float fR = getValue(mask.r, multR, black.r, white.r);\
		lv = vec3(fR, fR, fR);

#else

	#define getLerpVals(lv)\
		lv = getValues(mask.rgb, multR, multG, multB, black.rgb, white.rgb);
#endif
	
#else	//R16 curves
#ifdef SINGLE_CHANNEL
	#define getLerpVals(lv)\
		float fR = getValue(mask.r, multR.r, black.r, white.r);\
		lv = vec3(fR, fR, fR);
#else
	#define getLerpVals(lv)\
		lv = getValues(mask.rgb, vec3(multR.r, multG.r, multB.r), black.rgb, white.rgb);
#endif
#endif


//linear interpolation with an elbow along the way
vec3 tlerp(vec3 c1, vec3 c2, vec3 c3, vec3 t)
{
	vec3 m1 = mix(c1, c2, t * 2.0);
	vec3 m2 = mix(c2, c3, (t-0.5) * 2.0);
	return mix(m1, m2, step(0.5, t));
}

BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{

	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	vec4 clipMask = texture2D(tMask, tc);
	if(clipMask.r == 0.0)
	{ discard; }
	vec4 zero = getZero(tc);
	vec4 black = getBlack(tc);
	vec4 white = getWhite(tc);

	vec4 mask = getInterpolator(tc);	

	vec3 lerpVals;
	
#ifndef QC_NO_PIECEWISE
	vec4 multR = texture2D(tCurveR, tc);
#ifndef SINGLE_CHANNEL
	vec4 multG = texture2D(tCurveG, tc);
	vec4 multB = texture2D(tCurveB, tc);
#endif	//SINGLE_CHANNEL
	getLerpVals(lerpVals);	//piecwise interpolation
#else
	//linear interpolation
	lerpVals = clamp((mask.rgb-uValues[0])/(uValues[5]-uValues[0]), 0.0, 1.0);
	lerpVals = mix(black.rgb, white.rgb, lerpVals);
	
#endif //QC_NO_PIECEWISE

	vec3 predicted = lerpVals;
	vec4 result = vec4(predicted, 1.0);
	
//mix with the Zero key if !mask
#ifndef MASK_SHADER
#ifndef SINGLE_CHANNEL
	float opacityMult = mask.a * uOpacity;
#else
	float opacityMult = mask.g * uOpacity;
#endif	//!SINGLE_CHANNEL

#ifdef USE_SUB_KEYS	//if sub-keys are available, the alpha blend is piecewise
	vec4 subBlack = getSubBlack(tc);
	vec4 subGrey = getSubGrey(tc);
	vec4 subWhite = getSubWhite(tc);
	vec3 subResult = tlerp(subBlack.rgb, subGrey.rgb, subWhite.rgb, mask.rgb);
	result.rgb = tlerp(zero.rgb, subResult.rgb, result.rgb, vec3(opacityMult, opacityMult, opacityMult));
#else
	result = mix(zero, result, opacityMult);
#endif	//USE_SUB_KEYS

#ifdef SINGLE_CHANNEL
	result.g = 1.0;		//full alpha
#endif	//SINGLE_CHANNEL
#endif	//!MASK_SHADER

	OUT_COLOR0 = result;
	
	float inSquare = 1.0 - step(3.0, mod(IN_POSITION.y, 1024.0));
	inSquare = max(inSquare, 1.0 - step(3.0, mod(IN_POSITION.x, 1024.0)));
	
	OUT_COLOR0 = mix(OUT_COLOR0, vec4(0.0, 0.0, 0.0, 1.0), uWatermark * inSquare * (1.0-uUseValue));
}

