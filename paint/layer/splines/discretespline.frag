#include "../../../common/util.sh"
#include "SplineBufferTypes.frag"
USE_STRUCTUREDBUFFER(SplineSDFSegment, bSegmentData);
USE_TEXTURE2D(tSplineAlpha);
uniform mat4 uMaskTransform;

//miter types
#define MITER_NONE 0
#define MITER_NEXT_TOP 1
#define MITER_NEXT_BOTTOM 2
#define MITER_PREV_TOP 3
#define MITER_PREV_BOTTOM 4
#define MITER_APEX 5
#define MITER_BUTT 6
#define MITER_BUTT_PREV 7
#define MITER_BUTT_NEXT 8

#define isMiter(a) (a>=MITER_NEXT_TOP && a <= MITER_PREV_BOTTOM)
#ifndef SPLINE_FILL_SDF
USE_TEXTURE2D(tSegmentLookup);
#endif
uniform int uR8Lookup;

#ifdef SPLINE_FILL_SDF
	uniform float uSubtractiveShape;	//if 1, the AA will be on the inside of the shape for blending
	USE_TEXTURE2D(tFillMask);
#endif

#ifdef SPLINE_CONTOUR
	USE_TEXTURE2D(tContourData);
#endif

#ifndef INTERIOR_FILL_PASS
	#define USE_DEFASCETING
#endif

#ifdef USE_DEFASCETING
	USE_TEXTURE2D(tCourseCorrection);
#endif

uniform float	uContourAmplitude;
uniform int		uNumSegments;
uniform int 	uFirstSegment;
uniform vec3	uBoundsMax;
uniform vec3	uBoundsMin;
uniform float	uRadius;
uniform float	uEdgeAA;	//soft spline edges
uniform float   uUndulation;
uniform float   uUndulationFrequency;
uniform float   uModulation;
uniform float   uModulationFrequency;
uniform float	uTaper;
uniform float	uRounding;
uniform float 	uTestValue;		//for shader tweaking
uniform float	uQuantizedAA;
uniform float   uVStretch;
#ifdef EFFECT_POSITIONAL
uniform mat4	uModelViewInv;
uniform mat4	uMeshTransform;	//WS transform of our mesh, not the same as modelview, which is tied to linked mesh bounds
#endif

//segment of the spline as well as information about the entire path
struct Segment
{
	vec3 pos1;
	vec3 pos2;
	vec3 perp1;
	vec3 perp2;
	vec3 miterPerp;	//plane normal for precise mitering
	vec3 miterApex;	//point on said plane
	float dist1;
	float dist2;
	
	//lock distances:  this is used to modulate distortion near miters
	float wiggle1U0;
	float wiggle1U1;
	float wiggle2U0;
	float wiggle2U1;

	float pathLength;
	int miter;
	bool rightHanded;
	bool shapeLooped;
	float testValue;
	bool roundStart;
	bool roundEnd;
	bool symMirrored;
	bool symJoined;
};

//segment test result
struct LocalData
{
	bool inSegment;			//does this lie inside the segment
	bool failedDistortion;	//true if the segment was good until the distortion part
	vec2 splineUV;
	vec2 segmentUV;
	vec3 positionShift;	//from defasceting
	float distSquared;
	float maskAlpha;
	float AA;
	float testData;	//for debuggering
	
	//segment-space texture gradients to be used later
	vec2 dUVdxLocal;
	vec2 dUVdyLocal;
};



//turns our raw texture data into a segment.  does NOT do wiggle, as that data isn't required immediately and should be read separately
void makeSegment(inout Segment seg, vec4 tex1, vec4 tex2, vec4 tex3, vec4 tex4, int miterAndFlags)
{
	seg.wiggle1U0 = 999999.f;
	seg.wiggle2U0 = seg.wiggle2U1 = seg.wiggle1U1 = seg.wiggle1U0;
	seg.pos1 = tex1.xyz;
	seg.pos2 = tex2.xyz;
	seg.perp1 = tex3.xyz;
	seg.perp2 = tex4.xyz;
	seg.dist1 = tex1.w;
	seg.dist2 = tex2.w;
	seg.miter = miterAndFlags%16;
	int flags = (int)(miterAndFlags >> 4);
	seg.pathLength = tex4.w; 
	seg.rightHanded = flags & 1;
	seg.shapeLooped = flags & 2;
	seg.roundStart = flags & SPLINE_FLAG_ROUND_START;
	seg.roundEnd = flags & SPLINE_FLAG_ROUND_END; 
	seg.symMirrored = flags & SPLINE_FLAG_SYM_MIRROR;
	seg.symJoined = flags & SPLINE_FLAG_SYM_JOINED;
}

float pointSegmentDistanceSquared(vec3 p, vec3 s1, vec3 s2, inout float t)
{
	vec3 pTos1 = s1-p;
	vec3 segment = (s2-s1);	
	float sl2 = dot(segment, segment);
			
	float s2Dist2 = dot(s2-p, s2-p);
	float segLenInv2 = 1.0 / sl2;
	float tValue = -dot(segment, pTos1) * segLenInv2;

	t = tValue;
	
	//individual limit checks here because my previous check was getting optimized incorrectly on windows
	if(tValue >= 1.0)
	{ return s2Dist2; }
	if(tValue <= 0.0)
	{ return dot(pTos1, pTos1); }

	//somewhere in the middle
	vec3 closestOnSegment = s1 * (1.0 - tValue) + s2 * tValue;

	return dot(closestOnSegment-p, closestOnSegment-p);
}

//apply correction to the splineUV
vec2 adjustSplineCoord(vec2 splineUV, float correctedU)
{
#ifdef SPLINE_CONTOUR
	splineUV.x = mix(splineUV.x, correctedU, uContourAmplitude);
#endif
	return splineUV;
}

//gets a wrapping wave (or two) that doesn't have a discontinuity between t = 1 and t = 0
float getWave(float dist, float splineLength, float desiredWaveLength, bool loop)
{
	//get two wrappable waves near the desired wavelength and lerp between them
	float theta = dist / splineLength;
	float waveCountF = splineLength / desiredWaveLength;
	float waveCountI = floor(waveCountF + 0.5);
	//no need to prevent discontinuity if we're not looped
	waveCountI = mix(waveCountI, waveCountF, float(!loop));
	return sin(theta * waveCountI * 3.14159 * 2.0 + waveCountI * 3.0);
	
	//old method that lerped between two waves
/*
	float waveCount1 = floor(waveCountF);
	float waveCount2 = waveCount1 + 1.0;
	
	float t = fract(waveCountF);
	float wave1 = sin(theta * waveCount1 * 3.14159 * 2.0 + waveCount1 * 3.0);
	float wave2 = sin(theta * waveCount2 * 3.14159 * 2.0 + waveCount2 * 3.0);
	return mix(wave1, wave2, t);
*/
}

//apply radius/position modification
void distortSpline(inout vec3 pos, inout float radiusMult, vec2 segmentUV, float splineDist, Segment seg, inout float dbg)
{	
	//do two wiggle checks in case this is a long segment near two miters
	vec3 lock01 = vec3(0.0, seg.wiggle1U0, 0.0);
	vec3 lock11 = vec3(1.0, seg.wiggle1U1, 0.0);
	vec3 lock02 = vec3(0.0, seg.wiggle2U0, 0.0);
	vec3 lock12 = vec3(1.0, seg.wiggle2U1, 0.0);
	
	float tUnused;
	float dist1Squared = pointSegmentDistanceSquared(vec3(segmentUV.x, splineDist, 0.0), lock01, lock11, tUnused);
	float dist2Squared = pointSegmentDistanceSquared(vec3(segmentUV.x, splineDist, 0.0), lock02, lock12, tUnused);
	
	//wiggle freedom is determined by distance to the nearest locked-down point
	float wiggleFreedom = sqrt(saturate(min(dist1Squared, dist2Squared)));

	//wiggles and squoogles originate from the center of symmetry-joined shapes
	if(seg.symJoined)
	{ splineDist = abs(splineDist - seg.pathLength / uRadius / 2.0); }

	//three frequencies of wiggles, chosen for integer wavecounts, weighted by how close they are to their integers
	float squoogleFrequency = 0.6;
	float wiggleFrequency = 1.5; 
	float dSpline = splineDist;

	float radiusMult2 = 0.5 + 0.5 * getWave(splineDist, seg.pathLength/ uRadius, 15.0 / max(uModulationFrequency, 0.1), seg.shapeLooped) * 0.6;
		 radiusMult2 += 0.5 + 0.5 * getWave(splineDist, seg.pathLength/ uRadius, 9.5 / max(uModulationFrequency, 0.1), seg.shapeLooped) * 0.8;
	radiusMult2 = mix(1.0, radiusMult2, 0.3 * uModulation);
	float wiggle = 0.0;
	float wiggleMag = 1.0 + 0.25 / max(uUndulationFrequency, 0.25);
	wiggle      += getWave(splineDist, seg.pathLength / uRadius, 4.0/max(uUndulationFrequency, 0.1) * 1.25, seg.shapeLooped) * 0.4;
	wiggle 		+= getWave(splineDist, seg.pathLength / uRadius, 4.0/max(uUndulationFrequency, 0.1) * 2.3, seg.shapeLooped) * 0.7;
	wiggle      += getWave(splineDist, seg.pathLength / uRadius, 4.0/max(uUndulationFrequency, 0.1) * 3.7, seg.shapeLooped);
	
#ifndef SPLINE_FILL_SDF
	//V2 miters also lock the closer they get to the miter plane.
	//this step is necesssary with unfilled splines but it looks funny on filled splines
	if(dot(seg.miterPerp, seg.miterPerp) > 0.1)
	{
		vec3 apexToP = pos-seg.miterApex;
		float perpDist = saturate(dot(apexToP, seg.miterPerp) / uRadius);
		wiggleFreedom *= perpDist;
	}
#endif

	vec3 wiggleDir1 = seg.perp1;
	vec3 wiggleDir2 = seg.perp2;
	vec3 wiggleAxis = mix(wiggleDir1, wiggleDir2, segmentUV.y);
	wiggleAxis *= mix(1.0, -1.f, (float)seg.symMirrored);	//flip warp for symmetry mirrors
	pos += wiggleAxis * wiggle * uRadius * uUndulation * 0.125 * wiggleFreedom * wiggleMag;
	radiusMult = mix(radiusMult, radiusMult2, wiggleFreedom);
	float splineLength = seg.pathLength / uRadius;
	
	//now taper!
	float endDistance = min(dSpline, splineLength-dSpline);
	float taper = endDistance / (splineLength * 0.5f);
	radiusMult *= mix(1.0, taper, uTaper * float(!seg.shapeLooped) * wiggleFreedom);
	dbg = wiggleFreedom;
}

void applyEndRounding(inout LocalData ld, float splineLength, float dP)
{
	//90% of the complexity of this function comes from the fact that there's not a straightforward way
	//to get a distance field of an ellipse.  So we take several samples and pick one based on a few factors.
	vec2 splineUV = ld.splineUV;
	float distanceAlongSpline = splineUV.y * 2.0;
	float endDistance = min(distanceAlongSpline, splineLength-distanceAlongSpline);
	float uDist = abs(0.5-splineUV.x);
	float roundDistance = max(0.000001, uRounding);
	float localX = saturate(1.0-endDistance/roundDistance);
	
	//first test:  discard if rounding cuts off this pixel
	if(localX*localX * 0.25 + uDist*uDist > 0.25)
	{ ld.AA = 0.0; return; }
	
	float fadeDist = max(dP, 0.0000000001);
	ld.AA = saturate(endDistance*uRadius / fadeDist / uEdgeAA);	//unrounded AA
	
	if(uRounding == 0.0)	//the unrounded case
	{ return; }
	
	//Ramanujan's approximation of the perimeter of an ellipse
	float a = uRounding;
	float b = 1.0;
	float perimeter = 3.14159 * (3.0*(a+b) - sqrt((3*a+b)*(a+3*b))) * 0.5; 
	float vPlus = (perimeter/2.0-a*1.0) * 0.5;
	
	//suddenly, our rectangular coordinates turn into polar coordinates!
	float theta = 0.0;
	float x = localX;
	float y = 2.0 * (splineUV.x - 0.5);
	vec2 xy = vec2(x, y);
	if(abs(y) > 0.0)
	{ theta = atan(x/abs(y)); }
	
	float u = sqrt(localX*localX*0.25 + uDist*uDist) * 2.0;
	float v = theta / 3.14159 * 2.0;
	float atEnd = (float)(splineUV.y > splineLength * 0.25);
	float mul = 1.0-2.0 * atEnd;
		
	//height and width of the circle at our location (relative to the spline radius)
	float relHeight = sqrt(1.0-localX*localX);
	float relWidth = sqrt(saturate(1.0-(splineUV.x-0.5)*(splineUV.x-0.5)*4.0)); 

	//start and end uv.y-values of the rounded region
	float vStart = splineUV.y+localX * 0.5 * mul * uRounding;
	float vEnd = vStart - mul * relWidth * uRounding * 0.5;
	
	float AABias = 0.5;	//pixels
	float endDistancePixels = max(0.0, -mul*(vEnd-splineUV.y) / dP * uRadius * 2.0 / 0.7 - AABias);	//distance from the end of the rounded spline 
	float edgeDistancePixels = max(0.0, (relHeight-y) * uRadius / dP);						//distance from the top/bottom edge
	float diagonalDistancePixels = 0.707 * sqrt(endDistancePixels * endDistancePixels + edgeDistancePixels * edgeDistancePixels);	//mishmash of the two

	//pick the minimum value of the above
	float AAX = saturate(min(min(diagonalDistancePixels, endDistancePixels), edgeDistancePixels) / uEdgeAA);
	
	//apply the modified texture coords 
	float deltaV = vStart - mul * theta * 0.5 * perimeter / (3.14159 * 1.0) + vPlus - ld.splineUV.y;
	ld.splineUV.y += deltaV;
	ld.splineUV.x = 0.5 + u * 0.5 * sign(splineUV.x - 0.5);
	
	if(x <= 0.0)	//only apply AA to the rounded bits.  Otherwise we already have an AA function
	{ ld.AA = 1.0; return; }
	
	//we'll need texture gradients too...
	ld.dUVdxLocal = normalize(vec2((y), x)) / max(u, 0.01) / vec2(1.0, roundDistance);
	ld.dUVdxLocal.xy *= 1.0 - 2.0 * (float)(splineUV.x < 0.5);
	ld.dUVdyLocal = normalize(vec2(-ld.dUVdxLocal.y, ld.dUVdxLocal.x)) / vec2(1.0, roundDistance);
	
	//at rounding values near (but not greater than) 1, we can use a circle approximation,which is fully accurate at rounding=1
	float circleAAMix = saturate(uRounding-0.5) * 2.0 * (1.0-step(1.0, uRounding));

	float circleDistance = uRadius * (1.0-sqrt(x * x * max(uRounding, 1.0) * max(uRounding, 1.0) + y * y));
	float circleAA = saturate((circleDistance / dP) / uEdgeAA);

	if(uRounding == 1.0)
	{ ld.AA = circleAA; return;; }
	ld.AA = mix(AAX, circleAA, circleAAMix);
}

#ifdef USE_DEFASCETING
float defascet(inout vec3 pos, vec2 segmentUV, Segment seg, int segID, float splineDist)
{
	//do two wiggle checks in case this is a long segment near two miters
	vec3 lock01 = vec3(0.0, seg.wiggle1U0, 0.0);
	vec3 lock11 = vec3(1.0, seg.wiggle1U1, 0.0);
	vec3 lock02 = vec3(0.0, seg.wiggle2U0, 0.0);
	vec3 lock12 = vec3(1.0, seg.wiggle2U1, 0.0);
	
	float tUnused;
	float dist1Squared = pointSegmentDistanceSquared(vec3(segmentUV.x, splineDist, 0.0), lock01, lock11, tUnused);
	float dist2Squared = pointSegmentDistanceSquared(vec3(segmentUV.x, splineDist, 0.0), lock02, lock12, tUnused);
	//use wiggle freedom here too so we don't mess up miters
	float wiggleFreedom = sqrt(saturate(min(dist1Squared, dist2Squared)));

	uint2 CCSize; uint CCMips;
	imageSize2D( tCourseCorrection, CCSize.x, CCSize.y, CCMips );
	vec2 ccLookup = vec2(bSegmentData[segID].CCLookup[0], bSegmentData[segID].CCLookup[1]);
	float ccIndex = mix(ccLookup.x, ccLookup.y, saturate(segmentUV.y));		//this is the pixel we'll look at in our course correction texture
	float ccu = fract((ccIndex)/4096.0);
	float ccv = (floor(ccIndex/4096.0) + 0.5) / (float)CCSize.y;
	vec4 ccPos = texture2D(tCourseCorrection, vec2(ccu, ccv));
	vec3 thisPos = mix(seg.pos1, seg.pos2, saturate(segmentUV.y));
	vec3 thisPerp = normalize(mix(seg.perp1, seg.perp2, saturate(segmentUV.y)));
	vec3 delta = ccPos.xyz-thisPos;
	delta = thisPerp * dot(thisPerp, delta);						//constrain movement to our local perpendicular.  Fixes a lot of artifacts
	float deltaMag = length(delta);
	delta = delta / max(deltaMag, 0.0000001) * min(deltaMag, uRadius * 0.1);	//a little bit of a guardrail here
	float correctionAmount = wiggleFreedom;
	
	//new-style miter segments don't defascet--it doesn't look right and I haven't figured out why --KK
	if(!(seg.miter >= MITER_NEXT_TOP && seg.miter <= MITER_PREV_BOTTOM) && dot(seg.miterPerp, seg.miterPerp) > 0.1)
	{ delta *= 0.0; }
	
	pos -= delta * correctionAmount;	//subtract the delta because we're trying to find our new position relative to the spline
	return length(delta);
}
#endif

float pointLineDistanceSquared(vec3 p, vec3 s1, vec3 s2)
{
	vec3 pTos1 = s1-p;
	float epsSquared = 0.000000001f;
	vec3 segment = (s2-s1);		
	vec3 segNorm = normalize(segment);
	vec3 toLine = pTos1 - segNorm * dot(pTos1, segNorm);
	return dot(toLine, toLine);

}

float refineU(float estU, vec3 pos, Segment seg, float radiusMult)
{
	//find the actual line along the spline for this u-value
	vec3 p1u = seg.pos1 + seg.perp1 * estU * uRadius * radiusMult;
	vec3 p2u = seg.pos2 + seg.perp2 * estU * uRadius * radiusMult;
	
	float estV;
	float testDist2 = pointSegmentDistanceSquared(pos, p1u, p2u, estV);
	
	//re-estimate U using the new V
	vec3 posV = mix(seg.pos1, seg.pos2, estV);
	vec3 perpV = mix(seg.perp1, seg.perp2, estV) * uRadius * radiusMult;
	vec3 toP = pos-posV;
	float perpLength2 = dot(perpV, perpV);
	float newU = dot(toP, perpV)/perpLength2;	//distance from posV to pos, along the modified bitangent, divided by its length
	float deltaU = abs(estU-newU);
	return newU;
}

//way faster, simpler, and more robust than getUVs()!
bool getUVs2(inout vec2 uv, inout vec2 segmentUV, vec3 pos, Segment seg, float radiusMult, float dP)
{
	vec3 segDir = (seg.pos2-seg.pos1) / (seg.dist2-seg.dist1);
	float perpProject1 = dot(seg.perp1, segDir) * uRadius * radiusMult; 
	float perpProject2 = dot(seg.perp2, segDir) * uRadius * radiusMult;

	float segT;

	//use the t-value here for an estimate of v
	float segDist2 = pointSegmentDistanceSquared(pos, seg.pos1, seg.pos2, segT);
	
	//use distance from the line to get our u-value
	segDist2 = pointLineDistanceSquared(pos, seg.pos1, seg.pos2);
	float segDist = sqrt(segDist2);
	
	vec3 estPerp = mix(seg.perp1, seg.perp2, saturate(segT));	//saturate this one top prevent crazy vectors and accompanying artifacts
	vec3 estPos = mix(seg.pos1, seg.pos2, segT);

	//find the perpendicular component of the bitangent.  If this is low, then U is proportionally higher.
	vec3 avgPerp = normalize(estPerp);// = normalize((seg.perp1 + seg.perp2) * 0.5);
	float perpComponent = length(avgPerp - segDir * dot(segDir, avgPerp));
	segDist /= perpComponent;
	
	float sideDot = dot((pos-estPos), estPerp);
	float u = segDist / (uRadius * radiusMult);
	if(sideDot < 0.0)
	{ u *= -1.0; }

	/*
	//a pair of refinement passes should be all that's needed with improved initial U-finding
	float urefined = refineU(u, pos, seg, radiusMult);
	urefined = refineU(urefined, pos, seg, radiusMult); 
	vec3 lock01 = vec3(0.0, seg.wiggle1U0, 0.0);
	vec3 lock11 = vec3(1.0, seg.wiggle1U1, 0.0);
	vec3 lock02 = vec3(0.0, seg.wiggle2U0, 0.0);
	vec3 lock12 = vec3(1.0, seg.wiggle2U1, 0.0);
	float splineDist = mix(seg.dist1 / uRadius, seg.dist2/uRadius, segT)*2.0;
	float tUnused;
	float dist1Squared = pointSegmentDistanceSquared(vec3(u, splineDist, 0.0), lock01, lock11, tUnused);
	float dist2Squared = pointSegmentDistanceSquared(vec3(u, splineDist, 0.0), lock02, lock12, tUnused);

	float wiggleFreedom = sqrt(saturate(min(dist1Squared, dist2Squared)));
	wiggleFreedom = uTestValue;
	u = mix(urefined, u, wiggleFreedom);
	*/
	
	//find the actual line along the spline for this u-value
	vec3 p1u = seg.pos1 + seg.perp1 * u * uRadius * radiusMult;
	vec3 p2u = seg.pos2 + seg.perp2 * u * uRadius * radiusMult;
	
	//de-twist the segment to reduce the effect of very narrow quad sides with high perpendicular offsets
	vec3 mid = (p2u + p1u) * 0.5;
	vec3 wing = p2u-p1u;
	vec3 wingAdjust = segDir * dot(wing, segDir) * 0.5;
	p1u = mid + -wingAdjust;
	p2u = mid + wingAdjust;
	//our t-value along that line is our v-value
	float testDist2 = pointSegmentDistanceSquared(pos, p1u, p2u, segT);
	
	//our epsilon is determined by the t-value difference in a single pixel
	float segLength = length(p1u-p2u);
#ifdef LAYER_SH
	float epsilon = 1.5 * dP / segLength;
#else
	float epsilon = 1.05 * dP / segLength;
#endif
	float v = segT;
	float testVLow = v;
	float testVHigh = v;
//	if(seg.dist1 > 0.f)
	{ testVLow += epsilon; }
	
//	if(seg.dist2 < seg.pathLength)
	{ testVHigh -= epsilon; }

	if(abs(u) > 1.0 || testVHigh > 1.0 || testVLow < 0.0)
	{ return false; }
	
	u = u * 0.5 + 0.5;
	
	//check miters--v2 miters
	if(dot(seg.miterPerp, seg.miterPerp) > 0.1)
	{
		vec3 apexToP = pos-seg.miterApex;
		float perpDist = dot(apexToP, seg.miterPerp);
		if(perpDist < 0.0)
		{ return false; }
		
	}

#ifndef SPLINE_FILL
	//debug colors:  NEXT_BOTTOM: 	red			(first segment)
	//				 PREV_BOTTOM: 	yellow		(second segment)
	//				 NEXT_TOP: 		blue		(first segment)      
	//				 PREV_TOP:		light blue 	(second segment)
	
	//miters on the border of filled splines only fill 1/4 of the space (OUTER CORNERS ONLY)
#ifdef SPLINE_FILL_SDF
	bool cutFirstPart = (seg.miter == MITER_PREV_BOTTOM && !seg.rightHanded) || (seg.miter == MITER_PREV_TOP && seg.rightHanded);
	bool cutLastPart = (seg.miter == MITER_NEXT_BOTTOM && !seg.rightHanded) || (seg.miter == MITER_NEXT_TOP && seg.rightHanded);
					
	if(cutFirstPart && v < 0.5)
	{ return false; }
	if(cutLastPart && v > 0.5)
	{ return false; }
	
#endif //SPLINE_FILL_SDF

#endif //SPLINE_FILL  (confusing, I know)
	
	segmentUV.x = u;
	segmentUV.y = v;
	uv.x = u;
	uv.y = mix(seg.dist1, seg.dist2, v) / uRadius / 2.0;
	
	return true;
}

//makes sure textures projected along the spline loop seamlessly
float getVMultiplier(float segLength, bool looped)
{	
//	if(!looped)
//	{ return clamp(1.0/uVStretch, 0.01, 100.0); }
	//Ramanujan's approximation of the perimeter of an ellipse
	float a = uRounding;
	float b = 1.0;
	float perimeter = 3.14159 * (3.0*(a+b) - sqrt((3*a+b)*(a+3*b))) * 0.5; 
	float vPlus = (perimeter/2.0-a*1.0);

	float roundAdditionLength = vPlus * uRadius * 2.0;	//rounding turns the square at the end into a semicircle
	segLength += mix(0.0, roundAdditionLength, (float)(!looped) * saturate(ceil(uRounding))); 
	float countF = segLength / (uRadius * 2.0);
	float countI = floor(countF / clamp(uVStretch, 0.01, 100.0) + 0.5);
	return countI/countF; 
}

vec2 fixLoopedTextureSampling(vec2 coord)
{
	//when closing a looped section, splineUV.y will suddenly wrap back to zero, which can case texture sampling issues.
	//detect this before it happens and fix the tex coords
	//if there's a large delta, move the high side down to match the low side
	
	float uvy = coord.y;
	
	//take derivaties and then derivatives of those derivatives so we can detect any large change among the four pixels in the group
	float duvx = abs(dFdx(uvy));		
	float duvy = abs(dFdy(uvy));
	float duvxy = abs(dFdy(duvx));  //these are called mixed partial derivatives
	float duvyx = abs(dFdx(duvy));
	float maxmax = max(duvx, max(duvy, max(duvxy, duvyx)));
	
	//if any of the derivatives indicates a loop, lower the high side to match the low side
	if(maxmax > 1.0 && uvy > 1.0)
	{ uvy -= floor(uvy+0.5); }
	coord.y = uvy;
	return coord;
}

void calcTextureGradient(vec2 segmentUV, Segment seg, vec3 dpdx, vec3 dpdy, vec2 dUVdxLocal, vec2 dUVdyLocal, inout vec2 dUVdx, inout vec2 dUVdy)
{
	//use custom texture gradients to avoid sampling issues at segment intersections and miters
	float lx = length(dUVdxLocal);
	float ly = length(dUVdyLocal);
	
	//pixel-space directions of the x-, y- and z-axes
	vec3 xDir = vec3(dpdx.x, dpdy.x, 0.0);
	vec3 yDir = vec3(dpdx.y, dpdy.y, 0.0);
	vec3 zDir = vec3(dpdx.z, dpdy.z, 0.0);
	
	//spline U- and V- directions at this pixel
	vec3 p1 = seg.pos1 + seg.perp1 * (segmentUV.x * 0.2 - 0.1);
	vec3 p2 = seg.pos2 + seg.perp2 * (segmentUV.x * 0.2 - 0.1);
	vec3 baseV = normalize(p2-p1) / (uRadius * 2.0);	//v-vector of one full texture unit	
	vec3 baseU = mix(seg.perp1, seg.perp2, segmentUV.y) / (uRadius * 2.0); //u-vector of one full texture unit
	
	//local UV flow from corner rounding
	vec3 localV = dUVdxLocal.x * baseV + dUVdxLocal.y * baseU;
	vec3 localU = dUVdyLocal.x * baseV + dUVdyLocal.y * baseU;
	
	//apply to the position gradients:
	dUVdx = (localU.x * xDir.xy + localU.y * yDir.xy + localU.z * zDir.xy);
	dUVdy = (localV.x * xDir.xy + localV.y * yDir.xy + localV.z * zDir.xy);
	
	//this seems suspect--the V-multiplier seems like it should go in earlier, but this WORKS so I'm gonna leave it
	//until it doesn't work --KK
	float vMult = getVMultiplier(seg.pathLength, seg.shapeLooped);
	dUVdx.y *= -vMult;
	dUVdy.y *= vMult;
	dUVdy.x *= -1.0;
}

void fixSplineSpaceTextureSampling(vec2 segmentUV, vec2 splineUV, Segment seg, vec3 dpdx, vec3 dpdy, vec2 dUVdxLocal, vec2 dUVdyLocal, inout vec2 dUVdx, inout vec2 dUVdy)
{
	calcTextureGradient(segmentUV, seg, dpdx, dpdy, dUVdxLocal, dUVdyLocal, dUVdx, dUVdy);
//	splineUV.y /= uVStretch;
//	dUVdx = dFdx(splineUV);
//	dUVdy = dFdy(splineUV);

}

float lengthSquared(vec3 v)
{ return dot(v, v); }

//derivative-based antialiasing of segment edges
float antialiasSegment2(Segment seg, vec3 pos, vec2 segmentUV, vec3 dpdx, vec3 dpdy, float splineV, float modifiedRadius)
{
	vec3 centerPoint = mix(seg.pos1, seg.pos2, segmentUV.y);
	vec3 centerPerp = mix(seg.perp1, seg.perp2, segmentUV.y) * modifiedRadius;
	float modifiedU = segmentUV.x;
	//remove the normal component of the tri to reduce artifacts on sharp corners
#ifdef SPLINE_FILL_SDF
	//account for reduced profile in filled splines (but (mostly) not for subtractive shapes because the AA is shifted)
	centerPoint += centerPerp * (1.0-2.0*(float)seg.rightHanded) * saturate(1.0 - 0.99 * uSubtractiveShape);
	modifiedU += (-0.5+1.0*(float)seg.rightHanded) * saturate(1.0 - 0.99 * uSubtractiveShape);
#endif
	float dp = length(dpdx+dpdy);
	float signedEdgeDistance = length(pos-centerPoint) - length(centerPerp);
	signedEdgeDistance = -(0.5-abs(modifiedU-0.5)) * 2.0 * modifiedRadius;
	float signedEndDistance = abs(splineV * uRadius * 2.0 - seg.pathLength / 2.0) - seg.pathLength / 2.0 ;
	signedEndDistance = mix(signedEndDistance, -100.0, (float)seg.shapeLooped);
	float fadeDist = max(dp*dp, 0.0000000001);
	float aa = saturate(-signedEdgeDistance / sqrt(fadeDist) / uEdgeAA);
#ifdef SPLINE_FILL_SDF		//reverse the AA for subtractive shapes
	if(uSubtractiveShape == 1.0 && aa > 0.0)
	{ return max(aa, 10.0/255.0); }
#endif
	return aa;
}

vec2 mulPoint2(mat4 mat, vec2 pt)
{ return mulPoint(mat, vec3(pt, 0.0)).xy; }

vec2 mulVec2(mat4 mat, vec2 pt)
{ return mulVec(mat, vec3(pt, 0.0)).xy; }

//checks if position is within a single segment, gets UVs.
//segment and uv are only populated if all the tests are passed
//also updates the distance
LocalData checkSegment(int segIndex, vec3 pos, float bestPerpDistSquared, float bestAlpha, inout Segment seg, float radiusMult, float dPos, vec3 dpdx, vec3 dpdy)
{
	LocalData ld;
	ld.positionShift = vec3(0.0, 0.0, 0.0);
	ld.splineUV = vec2(.5, .25);
	ld.segmentUV = vec2(0.1, 0.8);
	ld.distSquared = 99999.0;
	ld.maskAlpha = 1.0;
	ld.AA = 0.0;
	ld.inSegment = false;
	ld.failedDistortion = false;
	ld.dUVdxLocal = vec2(1.0, 0.0);
	ld.dUVdyLocal = vec2(0.0, 1.0);
	
	int i = segIndex;
	#define bufferSeg bSegmentData[segIndex]
	vec4 s1 = vec4(bufferSeg.pos1, bufferSeg.segLength);
	float s1DistSquared = dot((s1.xyz-pos.xyz), (s1.xyz-pos.xyz));
	if(s1DistSquared > (s1.w + uRadius * radiusMult)*(s1.w + uRadius * radiusMult))
	{ return ld; }
	
	//bounds check early out!
	vec4 s2 = vec4(bufferSeg.pos2, bufferSeg.dist2);
	vec3 mins = min(s1.xyz, s2.xyz);
	vec3 maxs = max(s1.xyz, s2.xyz);
	vec3 inBounds = step(mins, pos + uRadius * radiusMult) * step(pos - uRadius * radiusMult, maxs);
	if(dot(inBounds, inBounds) < 2.9)
	{ return ld; }

	s1.w = (s2.w - s1.w); //fix s1.w to be point1 distance instead of the segment length
	float t = 1.0;
	float dSquared = pointSegmentDistanceSquared(pos, s1.xyz, s2.xyz, t);
	ld.distSquared = dSquared;
	float dt = length(vec2(dFdx(t), dFdy(t)));
	
	float better = 1.0;
	vec4 perps = vec4(bufferSeg.perp1, (float)bufferSeg.miter_and_flags+0.00001);
	vec4 perps2 = vec4(bufferSeg.perp2, bufferSeg.pathLength);
	makeSegment(seg, s1, s2, perps, perps2, (int)perps.w);
#ifndef SPLINE_FILL_INTERIOR
	if(seg.miter == MITER_BUTT_PREV && t < 0.0 && seg.roundStart == false)	//prev butt
	{ return ld; }
	else if(seg.miter == MITER_BUTT_NEXT && t > 1.0 && seg.roundEnd == false) //next butt
	{ return ld; }
#endif	
	//mitered segments don't participate in interior fill
#ifdef SPLINE_FILL_INTERIOR
	if(seg.miter >= MITER_NEXT_TOP && seg.miter <= MITER_PREV_BOTTOM)
	{ return ld; }
#endif
	//if the rough check succeeded, do a more nuanced check to see if we're in the quadralateral
	//both tests are necessary or we get different sorts of artifacts
	//segment lock data is now needed
	vec4 extra = bufferSeg.wiggleDistance;
	float lockDistance = uRadius;	//distortion lockdown falls to zero over this distance from a miter
	extra = (extra / lockDistance);
	seg.wiggle1U0 = extra.x;
	seg.wiggle1U1 = extra.y;
	seg.wiggle2U0 = extra.z;
	seg.wiggle2U1 = extra.w;
	int flags = (int)extra.z;

	//NO MITERS HERE!
	seg.miterPerp = vec3(0.0, 0.0, 0.0);
	int miter = seg.miter;
	seg.miter = 0;
	better = (float)getUVs2(ld.splineUV, ld.segmentUV, pos, seg, radiusMult, dPos);
	float initialAdjustedU = (ld.segmentUV.x-0.5)*radiusMult+0.5;
	seg.miter = miter;
	
	float radiusMult2 = 1.0;	//inout for distortSpline
	vec3 pos2 = pos;
	ld.testData = -1.0;
	seg.miterPerp = bufferSeg.miterPerp;
	seg.miterApex = bufferSeg.miterApex;
	distortSpline(pos2, radiusMult2, vec2((ld.segmentUV.x - 0.5) * radiusMult + 0.5, ld.segmentUV.y), ld.splineUV.y * 2.0, seg, ld.testData);
#ifdef SPLINE_FILL_INTERIOR
	radiusMult2 = radiusMult;		//override this if we're doing an interior fill so we can fill to a larger radius
#endif
	if(better == 0.0)
	{ return ld; }
	float prevU = ld.segmentUV.x;
	float modifiedUVX = (ld.segmentUV.x - 0.5) * radiusMult + 0.5;
#ifdef USE_DEFASCETING
	//position micro-adjustment
	vec3 prevPos = pos2;
	ld.testData = defascet(pos2, vec2(modifiedUVX, ld.segmentUV.y), seg, segIndex, ld.splineUV.y * 2.0);
	ld.positionShift = pos2-prevPos;
#endif //USE_DEFASCETING

	better = (float)getUVs2(ld.splineUV, ld.segmentUV, pos2, seg, radiusMult2, dPos);
	ld.AA = 1.0;
	if(!seg.shapeLooped)
	{ applyEndRounding(ld, seg.pathLength/uRadius, dPos); }
	better = better * ld.AA;
	ld.segmentUV.x = ld.splineUV.x;
	#ifdef SPLINE_COMPOSITE
		better = 1.0;
	#endif
	ld.failedDistortion = (better == 0.0 && saturate(initialAdjustedU) == initialAdjustedU);
	ld.splineUV.x = ld.segmentUV.x;
	float minAlpha = 0.0;
#ifdef USE_ALPHA_FOR_LOOKUP
	if(better == 1.0)
	{
		float maskOffset = 0.0;
		#ifdef SPLINE_FILL_SDF
			maskOffset = 0.5;
			
			//a minimumn alpha here provides AA on the boundary between the interior fill (already rendered at this point) 
			//and the profile part that's being calculated right now.  Otherwise a zero mask value will expose that raw edge
			float dR = dPos / (uRadius * 2.0);	//spline diameters per pixel
			minAlpha = saturate(1.0-min(ld.segmentUV.x, 1.0-ld.segmentUV.x) / (dR * uEdgeAA));
		#endif
		vec2 uv = vec2(ld.splineUV.x + maskOffset, ld.splineUV.y * getVMultiplier(seg.pathLength, seg.shapeLooped));
		vec2 alphaGradX;
		vec2 alphaGradY;
		calcTextureGradient(ld.segmentUV, seg, dpdx, dpdy, ld.dUVdxLocal, ld.dUVdyLocal, alphaGradX, alphaGradY);
		uv = mulPoint2(uMaskTransform, uv);
		vec4 maskTex = texture2DGrad(tSplineAlpha, uv, mulVec2(uMaskTransform, alphaGradX), mulVec2(uMaskTransform, alphaGradY));
		ld.maskAlpha *= max(minAlpha, maskTex.r * maskTex.a);
#ifdef SPLINE_FILL_SDF	
		//For sidedness determination, never alpha-fail the outside part, or we get false positives on the inside part
		if((ld.segmentUV.x > 0.5) == seg.rightHanded)
		{ ld.maskAlpha = 1.0; }
#else		//SPLINE_FILL_SDF
		//discard very low alpha	
		if(ld.maskAlpha < 2.0/255.0)
		{ better = 0.0; }
#endif	//SPLINE_FILL_SDF (else)
	}

#endif	//USE_ALPHA_LOOKUP

#ifdef SPLINE_FILL_SDF
		//better = if we're close to the center of the segment
		better *= (float)(dSquared < bestPerpDistSquared);
#else
		//better = if the alpha value is better or it's the same and the distance is closer 
		better *= (float)(ld.maskAlpha*ld.AA > bestAlpha || (ld.maskAlpha * ld.AA == bestAlpha && dSquared < bestPerpDistSquared));
#endif
		bestAlpha = mix(bestAlpha, ld.maskAlpha * ld.AA, better);

#ifdef SPLINE_FILL_SDF
	//encode AA values now
	ld.AA = antialiasSegment2(seg, pos2, ld.segmentUV, dpdx, dpdy, ld.splineUV.y, uRadius);
#endif
	ld.distSquared = dSquared;
	ld.inSegment = (better != 0.0);
	return ld;
}

struct SegmentResult
{
	int segNum;
	vec2 splineUV;
	Segment seg;
	bool insideSegment;		//if false, this might just be our closest approach
	float perpDistSquared;
	float alpha;
};

SegmentResult findBestSegment(vec3 pos, float radiusMult, int firstSeg, int lastSeg)
{
	SegmentResult result;
	result.segNum = -1;
	result.insideSegment = false;
	result.alpha = 0.0;
	result.perpDistSquared = 99999999.0;
	Segment testSeg;
	float dP = length(dFdx(pos) + dFdy(pos));	//used for epsilons/fudge factors
	float bestPerpDistSquared = uRadius * uRadius * radiusMult * radiusMult;
	LocalData bestHit;
	
#if defined(SPLINE_FILL_PASS) || defined(INTERIOR_FILL_PASS)
	#define NEAR_MISS_OKAY
#endif

#ifdef NEAR_MISS_OKAY
//for the interior fill, we can potentially count some near-misses as being inside if they failed post-distortion
//this helps us to not skip interior pixels, but avoids artifacts outside the shape
	SegmentResult nearResult;
	nearResult.segNum = -1;
	nearResult.alpha = 0.0;
	nearResult.insideSegment = false;
	nearResult.perpDistSquared = 9999999.0;
#endif
	for(int i = firstSeg; i <= lastSeg; i++)
	{
		LocalData ld = checkSegment(i, pos, result.perpDistSquared, result.alpha, testSeg, radiusMult, dP, dFdx(pos), dFdy(pos));
		if(ld.inSegment)
		{ 
			testSeg.testValue = ld.testData;
			result.segNum = i;
			result.alpha = ld.maskAlpha * ld.AA;
			result.splineUV = ld.splineUV;
			result.seg = testSeg;
			result.perpDistSquared = ld.distSquared;
			result.insideSegment = ld.inSegment;
		}
#ifdef NEAR_MISS_OKAY
		else if(ld.failedDistortion && ld.distSquared < nearResult.perpDistSquared && (testSeg.miter < 1 || testSeg.miter > 4))
		{
			//keep track of our closest near miss
			nearResult.segNum = i;
			nearResult.alpha = ld.maskAlpha * ld.AA;
			nearResult.splineUV = ld.splineUV;
			nearResult.seg = testSeg;
			nearResult.perpDistSquared = ld.distSquared;
			nearResult.insideSegment = ld.inSegment;

		}
#endif
	}
	
#ifdef NEAR_MISS_OKAY
	//for segment border fill, keep the interior parts of the spline even if they didn't pass after distortion
	if(result.segNum == -1 && nearResult.segNum != -1 && ((nearResult.splineUV.x < 0.5) == nearResult.seg.rightHanded))
	{ 
		nearResult.splineUV.x = 1.0-(float)nearResult.seg.rightHanded; 
		nearResult.insideSegment = true;
		nearResult.alpha = 1.0;
		return nearResult;
	}

#endif
	return result;
}
