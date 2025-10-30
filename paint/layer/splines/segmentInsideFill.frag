uniform float 	uRadius;
#ifndef JUST_FILL
	//per-tri segment variables
	USE_BUFFER(uint, bTriSegmentList);
	uniform int uTriSegListStart;
	uniform int uTriSegListCount;
	uniform vec3 uTriCorners[3];
	uniform vec3 uFaceNormal;
	#define SPLINE_FILL_INTERIOR
	#include "SplineBufferTypes.frag"
	USE_STRUCTUREDBUFFER(SplineBorderSegment, bSegmentData);
	#include "borderfill.frag"
#endif


#ifdef PROJECTED_SPLINE
	#define NO_FILL_MAIN
	#include "splinefill.frag"
#endif

#if defined(CACHE_READ) || defined(CACHE_WRITE)
uniform int2 uBufferSize;
uniform int	uCacheSize;
USE_INTERLOCKED_BUFFER(bSegmentCache, 1);
#endif


uniform int uR8;
uniform float uThickness;		//what's the minimum border thickness we're seeking?
uniform vec3	uBoundsMax;
uniform vec3	uBoundsMin;

BEGIN_PARAMS
	INPUT0(vec4, fPosition)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
#ifdef JUST_FILL	//variant for internal triangles.  it's important to use the same shader or we might miss pixels
	OUT_COLOR0 = vec4(1.0, 1.0, 1.0, 1.0);
#elif defined(PROJECTED_SPLINE)
	vec3 projected = mulPoint(uProjection, fPosition.xyz).xyz;
	float insidePath = pointInsideSpline(projected);
	if(insidePath == 0.0)
	{ discard; return; }
	OUT_COLOR0 = vec4(1.0, 1.0, 1.0, 1.0);
#else
	vec3 pos = (fPosition / fPosition.w).xyz;
	vec3 faceNormal = normalize(cross(dFdx(pos), -dFdy(pos)));
	faceNormal = uFaceNormal;		//uncomment to add in some numerical jitter that can be handy for fixing clipping issues
	//early out if we're not in the bounding box of the curve
	float mult = uThickness / uRadius;
	vec3 inBounds = step(uBoundsMin, pos + uRadius * 1.5f) * step(pos - uRadius * 1.5, uBoundsMax);
	if(dot(inBounds, inBounds) < 2.9)
	{ discard; }
	
	
	int firstSeg = uFirstSegment;
	int lastSeg = uFirstSegment+uNumSegments-1;
#ifdef CACHE_READ
	uint bx = (int)(IN_POSITION.x*(float)uCacheSize/(float)uBufferSize.x);
	uint by = (int)(IN_POSITION.y*(float)uCacheSize/(float)uBufferSize.y);
	uint cacheCoord = bx + by * uCacheSize;
	uint2 sparseData = interlockedLoad2(bSegmentCache, cacheCoord*2);
	firstSeg = sparseData.x + uFirstSegment;
	lastSeg = sparseData.y + uFirstSegment;
	if(firstSeg > lastSeg)	//no segment hit if min seg > max seg
	{ discard; }
#endif

	float val = 1.0;
	
	bool correctHand = false;
	vec4 debugData = vec4(0.f, 0.0,0.0, 0.0);
	int bestFarSeg = findBestSegmentSimple(pos, faceNormal, correctHand, mult, firstSeg, lastSeg, debugData);
	
	//caching variables
	int minSeg = bestFarSeg;
	int maxSeg = bestFarSeg;
	
	
#ifdef CACHE_WRITE
	//fill in min/max segment data
	if(minSeg > -1)
	{
		uint bx = (int)(IN_POSITION.x*(float)uCacheSize/(float)uBufferSize.x);
		uint by = (int)(IN_POSITION.y*(float)uCacheSize/(float)uBufferSize.y);
		uint cacheCoord = bx + by * uCacheSize;

		uint prev;
		interlockedMin(bSegmentCache, cacheCoord*2, minSeg-uFirstSegment, prev);
		interlockedMax(bSegmentCache, cacheCoord*2+1, maxSeg-uFirstSegment, prev);
	}
#endif

	if(correctHand == false)
	{ discard; }
	
	OUT_COLOR0 = vec4(val, val, val, 1.0);
	

#endif //JUST_FILL	

}

