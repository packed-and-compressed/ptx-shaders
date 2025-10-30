
#include "quantummultiplication.sh"

//RG components of the y-axis keys
USE_TEXTURE2D(tCurveR);
USE_TEXTURE2D(tCurveG);
USE_TEXTURE2D(tCurveB);

//and B components
#ifdef QC_SPLIT_BLUE
USE_TEXTURE2D(tCurveRB);
USE_TEXTURE2D(tCurveGB);
USE_TEXTURE2D(tCurveBB);
#endif

USE_TEXTURE2D(tInterpolator);
USE_TEXTURE2D(tZero);
USE_TEXTURE2D(tBlack);
USE_TEXTURE2D(tWhite);

//blue channels of our keys
#ifdef QC_SPLIT_BLUE
USE_TEXTURE2D(tBlackB);
USE_TEXTURE2D(tWhiteB);
USE_TEXTURE2D(tZeroB);
#endif

uniform vec3 uValue;
uniform float uUseValue;
uniform float uNormalization;
//the t-value of our reference points away from z+.  i.e. if 0.9, the x- reference was rendered with a vector of (0.9, 0.0, 0.44)
uniform float uExtrapolation;	
uniform float uModifiedExtrapolation;
uniform float uWatermark;
uniform float uOpacity;

//closer than linear approximation, only valid between -pi/2 and pi/2
float fastCos(float a)			 
{ return 1.0-0.4055 * a*a; }


//valid between 0 and pi
float fastSin(float a)			 
{ return fastCos(a-1.5707); }


float fastAcos(float c)	//valid [-1, 1], returns pi to 0
{ 
	float ltz = float(c < 0.0);
	float plusOrMinus = 1.0 - 2.0 * ltz;
	
	return ltz * 3.14159 + plusOrMinus * sqrt(2.466 * (1.0 - plusOrMinus*c));
}

vec3 interpolateVec(vec3 v0, vec3 v1, float t)
{
//	return normalize(mix(v0, v1, t));
	vec3 perp = cross(v0, v1);								//get a perpendicular so we can construct a coordinate axis
	float l2 = dot(perp, perp);
	if(l2 < 0.0001)
	{ return mix(v0, v1, t); }
	v0 = normalize(v0);
	v1 = normalize(v1);
	perp /= sqrt(l2);
	vec3 v2 = cross(perp, v0);			//v0 and v2 are perpendicular to each other and coplanar with v1
	float angle = fastAcos(dot(v0, v1));	//current angle between our input vectors
	angle *= t;							//we want angle * t
	return v0 * cos(angle) + v2 * sin(angle);		//should already be normalized
	
}

//signedness of interpolator has already been accounted for here: x- and y-basis vectors have been flipped
//if interpolator.x/y is negative
vec3 combineBasisVectors(vec3 xBasis, vec3 yBasis, vec3 zBasis, vec3 interpolator)
{
	//interpolate horizontal first
	float theta = atan2(abs(interpolator.y), abs(interpolator.x));	//get the first-quadrant angle between x and y
	float phi = atan2(interpolator.z, length(interpolator.xy));		
	vec3 horizontal = interpolateVec(xBasis, yBasis, theta/1.5707);
	vec3 sum = interpolateVec(horizontal, zBasis, phi/1.5707);
	return sum;
}



vec3 vectorNormalize(vec3 v)
{
	return normalize(v - 0.5) * 0.5 + 0.5;
}

void extrapolate(inout vec4 v, vec3 center, float amount)
{
	vec3 mod1 = mix(center.rgb, v.rgb, 1.0/amount);
	vec3 mod2 = interpolateVec(center, v.rgb, 1.0/amount);
	v.rgb = mix(mod1, mod2, uModifiedExtrapolation);
}

BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	
	//five different input extremes--left, right, up, down, and out
	vec4 zero = texture2D(tZero, tc);
	vec4 xminus = texture2D(tBlack, tc);
	vec4 xplus = texture2D(tWhite, tc);
	vec4 yminus = texture2D(tCurveR, tc);
	vec4 plain = texture2D(tCurveG, tc);
	vec4 yplus = texture2D(tCurveB, tc);
	vec4 mask = texture2D(tInterpolator, tc);
#ifdef QC_SPLIT_BLUE
	zero.ba = vec2(texture2D(tZeroB, tc).r, 1.0);
	xminus.ba = vec2(texture2D(tBlackB, tc).r, 1.0);
	xplus.ba = vec2(texture2D(tWhiteB, tc).r, 1.0);
	yminus.ba = vec2(texture2D(tCurveRB, tc).r, 1.0);
	plain.ba = vec2(texture2D(tCurveGB, tc).r, 1.0);
	yplus.ba = vec2(texture2D(tCurveBB, tc).r, 1.0);
#endif
	mask.rgb = mix(mask.rgb, uValue.rgb, uUseValue);
	mask.a *= uOpacity;
	
	xminus.xyz = xminus.xyz * 2.0 - 1.0;
	yminus.xyz = yminus.xyz * 2.0 - 1.0;
	xplus.xyz = xplus.xyz * 2.0 - 1.0;
	yplus.xyz = yplus.xyz * 2.0 - 1.0;
	plain.xyz = plain.xyz * 2.0 - 1.0;
	
	
	//use the quantum layer's normal to interpolate between the possibilities
	vec3 dir = mask.rgb * 2.0 -1.0;
	float cphi = length(dir.xy);

	//form basis vectors by blending the extremes (hopefully avoiding a weird joint in the graph)
	bool vecLerp = uModifiedExtrapolation;
	float basisBlending = 0.2;//mix(0.2, 0.00001, float(vecLerp));
	
	vec3 xBasis = mix(-(xminus.xyz), xplus.xyz, smoothstep(-basisBlending, basisBlending, dir.x));	
	vec3 yBasis = mix(-(yminus.xyz), yplus.xyz, smoothstep(-basisBlending, basisBlending, dir.y));
	vec3 zBasis = plain.xyz;
	float sgnx = mix(-1.0, 1.0, step(0.0, dir.x));
	float sgny = mix(-1.0, 1.0, step(0.0, dir.y));
	xBasis *= sgnx;
	yBasis *= sgny;
	
	vec3 sum = combineBasisVectors(xBasis, yBasis, zBasis, dir);

	sum = normalize(sum);
	sum = sum * 0.5 + 0.5;
	vec4 result = vec4(sum, 1.0);
	result = mix(zero, result, mask.a);
	OUT_COLOR0 = result;
	float len = length((sum.xyz * 2.0 - 1.0) );

	float inSquare = 1.0 - step(3.0, mod(IN_POSITION.y, 1024.0));
	inSquare = max(inSquare, 1.0 - step(3.0, mod(IN_POSITION.x, 1024.0)));
	OUT_COLOR0 = mix(OUT_COLOR0, vec4(0.0, 0.0, 0.0, 1.0), uWatermark * inSquare * (1.0-uUseValue));


}

