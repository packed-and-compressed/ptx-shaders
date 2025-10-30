#define INDIRECTION_MULTIPLIER 1.1

#include "layer/layernoise.sh"
#include "commonCull.sh"
#include "data/shader/paint/sharedpaint.sh"

//guassian distribution, centered around 0.0
float randomGauss(vec2 seed)
{
	float val = rand(seed);
	val += rand(seed + vec2(0.01, 0.01));
	val += rand(seed + vec2(0.02, 0.02));
	val += rand(seed + vec2(0.03, 0.03));
	val += rand(seed + vec2(0.04, 0.04));
	return val * 0.2;

}

//brush hardness function.  Dist is 0 to 1
//ddr is the per-pixel derivative dist, used for AA
float distanceToValue(float dist, float ddr, float brushHardness)
{
	float fallOffDistance = 1.0-brushHardness;	
#ifndef THIN_STROKE
	dist = computeBrushAlphaDist( dist, brushHardness );
	float minFallOffDist = min(ddr, 2.0);
#else	

	float pixelRadius = 1.0 / ddr;	
	float smallness = saturate(1.5 - pixelRadius);	//controls special considerations for very small brushes
		
	dist = mix(computeBrushAlphaDist( dist, brushHardness ), dist, smallness);	//this helps us get a nicer radius for soft brushes	
	float minFallOffDist = 1.0 / max(pixelRadius, 0.5);  //avoid divide-by-zero
#endif
	
	fallOffDistance = max(fallOffDistance, minFallOffDist);
	float fallOffStart = 1.0-fallOffDistance;
#ifdef THIN_STROKE
	float fallOffMult = 1.0 + 0.5 * smallness;
	fallOffDistance *= fallOffMult;
#endif	
	float dR = 0.25 * ddr;
	
	//take the average of two points for some easy AA
	float v1 = fallOff(dist-dR, fallOffStart, fallOffDistance);
	float v2 = fallOff(dist+dR, fallOffStart, fallOffDistance);
	return v1 * 0.5 + v2 * 0.5;
}

//gets the effective radius value of a tex coord if we're softening a square instead of a circle
float getVignette(vec2 texCoord, float hardness)
{
	//feather the brush stroke.  Squareness/cornerness are used to for hardness with textures
	float distanceValCircle = length(texCoord);
	float distanceValSquare = max(abs(texCoord.x), abs(texCoord.y));
	float cornerness = (distanceValCircle - distanceValSquare) / 0.414;
	float squareness = pow(hardness * float(1.0), 0.75);
	squareness = max(0.0, squareness - cornerness * (1.0-hardness));
	return mix(distanceValCircle, distanceValSquare, squareness);
}



vec4 blendRGBA(vec4 bottom, vec4 top)
{
	bottom.rgb *= bottom.a * (1.0-top.a);
	top.rgb *= top.a;
	float outAlpha = bottom.a + (1.0-bottom.a) * top.a;
	vec4 result = bottom + top;
	result.rgb /= max(outAlpha, 0.001);
	result.a = outAlpha;
	return result;
}



//lots of things to support variable splot counts
//even/odd is used if we want to pack two splots into the same data struct
#define splotThingOdd(m, n)
#define splotThingEven(m, n)

#define SPLOT_0 splotThing(0) splotThingEven(0, 0)
#if(SPLOT_COUNT > 1)
	#define SPLOT_1 splotThing(1) splotThingOdd(1, 0)
#else
	#define SPLOT_1
#endif

#if(SPLOT_COUNT > 2)
	#define SPLOT_2 splotThing(2) splotThingEven(2, 1)
#else
	#define SPLOT_2
#endif

#if(SPLOT_COUNT > 3)
	#define SPLOT_3 splotThing(3) splotThingOdd(3, 1)
#else
	#define SPLOT_3
#endif

#if(SPLOT_COUNT > 4)
	#define SPLOT_4 splotThing(4) splotThingEven(4, 2)
#else
	#define SPLOT_4
#endif

#if(SPLOT_COUNT > 5)
	#define SPLOT_5 splotThing(5)  splotThingOdd(5, 2)
#else
	#define SPLOT_5
#endif

#if(SPLOT_COUNT > 6)
	#define SPLOT_6 splotThing(6) splotThingEven(6, 3)
#else
	#define SPLOT_6
#endif

#if(SPLOT_COUNT > 7)
	#define SPLOT_7 splotThing(7) splotThingOdd(7, 3)
#else
	#define SPLOT_7
#endif

#if(SPLOT_COUNT > 8)
	#define SPLOT_8 splotThing(8) splotThingEven(8, 4)
#else
	#define SPLOT_8
#endif

#if(SPLOT_COUNT > 9)
	#define SPLOT_9 splotThing(9) splotThingOdd(9, 4)
#else
	#define SPLOT_9
#endif

#if(SPLOT_COUNT > 10)
	#define SPLOT_10 splotThing(10) splotThingEven(10, 5)
#else
	#define SPLOT_10
#endif

#if(SPLOT_COUNT > 11)
	#define SPLOT_11 splotThing(11) splotThingOdd(11, 5)
#else
	#define SPLOT_11
#endif

#if(SPLOT_COUNT > 12)
	#define SPLOT_12 splotThing(12) splotThingEven(12, 6)
#else
	#define SPLOT_12
#endif

#if(SPLOT_COUNT > 13)
	#define SPLOT_13 splotThing(13) splotThingOdd(13, 6)
#else
	#define SPLOT_13
#endif

#if(SPLOT_COUNT > 14)
	#define SPLOT_14 splotThing(14) splotThingEven(14, 7)
#else
	#define SPLOT_14
#endif

#if(SPLOT_COUNT > 15)
	#define SPLOT_15 splotThing(15) splotThingOdd(15, 7)
#else
	#define SPLOT_15
#endif

#if(SPLOT_COUNT > 16)
	#define SPLOT_16 splotThing(16) splotThingEven(16, 8)
#else
	#define SPLOT_16
#endif

#if(SPLOT_COUNT > 17)
	#define SPLOT_17 splotThing(17) splotThingOdd(17, 8)
#else
	#define SPLOT_17
#endif

#if(SPLOT_COUNT > 18)
	#define SPLOT_18 splotThing(18) splotThingEven(18, 9)
#else
	#define SPLOT_18
#endif

#if(SPLOT_COUNT > 19)
	#define SPLOT_19 splotThing(19) splotThingOdd(19, 9)
#else
	#define SPLOT_19
#endif

#if(SPLOT_COUNT > 20)
	#define SPLOT_20 splotThing(20) splotThingEven(20, 10)
#else
	#define SPLOT_20
#endif

#if(SPLOT_COUNT > 21)
	#define SPLOT_21 splotThing(21) splotThingOdd(21, 10)
#else
	#define SPLOT_21
#endif

#if(SPLOT_COUNT > 22)
	#define SPLOT_22 splotThing(22) splotThingEven(22, 11)
#else
	#define SPLOT_22
#endif

#if(SPLOT_COUNT > 23)
	#define SPLOT_23 splotThing(23) splotThingOdd(23, 11)
#else
	#define SPLOT_23
#endif

#define DO_ALL_SPLOTS SPLOT_0 SPLOT_1 SPLOT_2 SPLOT_3 SPLOT_4 SPLOT_5 SPLOT_6 SPLOT_7\
 SPLOT_8 SPLOT_9 SPLOT_10 SPLOT_11 SPLOT_12 SPLOT_13 SPLOT_14 SPLOT_15 \
 SPLOT_16 SPLOT_17 SPLOT_18 SPLOT_19 SPLOT_20 SPLOT_21 SPLOT_22 SPLOT_23
 


//normal-based culling stuff

#ifdef USE_FALLOFF
#define TANGENT_SPACE 1
#define WORLD_SPACE 2
#define VERTEX 3
#define FACE 4

	//construct the worldspace normal from the normal map
#define CALC_WS_NORMAL\
	{\
	vec3 TSNormal = texture2D(tTSNormalMap, texCoord).rgb * 2.0 - 1.0;\
	vec3 tangent = fTangent;\
	l = length(tangent);\
	if(l > 0.0001)\
	{ tangent /= l; }\
	vec3 bitang = normalize(cross(normHere, tangent));\
	l = length(bitang);\
	if(l > 0.0001)\
	{ bitang /= l; }\
	normHere = normalize(TSNormal.x * tangent + TSNormal.y * bitang + TSNormal.z * normHere);\
}

#define CALC_TS_NORMAL normHere = normalize(texture2D(tTSNormalMap, texCoord).rgb * 2.0 - 1.0);

//with face normals, we don't need TS so the fTangent varying is used to store vertex position
//vertex position is apparently backwards for the overlay???
#ifdef USE_OVERLAY
#define CALC_FACE_NORMAL normHere = normalize(cross(dFdy(fTangent), dFdx(fTangent)));
#else
#define CALC_FACE_NORMAL normHere = normalize(cross(dFdx(fTangent), dFdy(fTangent)));
#endif

#if(TEST_NORMAL==TANGENT_SPACE)
 	#define GET_TEST_NORMAL CALC_TS_NORMAL
#elif(TEST_NORMAL==WORLD_SPACE)
	#define GET_TEST_NORMAL CALC_WS_NORMAL
#elif(TEST_NORMAL==FACE)
	#define GET_TEST_NORMAL CALC_FACE_NORMAL
#else
	#define GET_TEST_NORMAL
#endif
 
#endif

#define REF_NORM(n) uRefNorm[n].xyz

/*
//ref normal is generally handled on the CPU side, but not alllways
#if(TEST_NORMAL!=TANGENT_SPACE)
	#define REF_NORM(n) uRefNorm[n].xyz
#else
	#define REF_NORM(n) vec3(0.0, 0.0, 1.0)
#endif
*/

//coords are 0-centered, not truly UV
vec2 squishUV(vec2 uv, float angleRadians, float amount, float width)
{
    float r = length(uv);
    vec2 dirVec = vec2(cos(angleRadians), sin(angleRadians));
	float d = dot(uv/r, dirVec); 
	float d2 = dot(uv/r, vec2(dirVec.y, -dirVec.x));
	float plusD = smoothstep(0.0, 1.0, sin(max((d), 0.0)));
    float minusD = smoothstep(0.0, 1.0, sin(max(abs(d2), 0.0)));
    float plus = pow(plusD, 4.0/width) * r;
    float minus = pow(minusD, 4.0/width) * r;
	float rnew = r;
    rnew += plus * amount;
    rnew -= minus * amount;

	uv = uv / rnew * r;
    return uv;
    
}

vec2 distortUV(vec2 uv, float amount, int seed)
{
	uv = (uv - 0.5) * 2.0;
	float r = length(uv);
	if(r < 0.01)
	{ return uv * 0.5 + 0.5; }
	float effectTheta = 8.0 * float(seed);
    uv = squishUV(uv, effectTheta, -0.45 * amount, 1.0);
    float t2 = -5.0 * (float)seed;
    uv = squishUV(uv, t2, 0.25 * amount, 0.5);
      
	return uv * 0.5 + 0.5;
}


