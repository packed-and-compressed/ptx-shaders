#ifdef SPLINE_FILL_PASS
	#define FILL_SPLINE_MASK
uniform int	uFlags;	//1 bit of flags can go with the SDF
#endif

#if defined(CACHE_READ) || defined(CACHE_WRITE)
uniform int2 uBufferSize;
uniform int	uCacheSize;
USE_INTERLOCKED_BUFFER(bSegmentCache, 1);
#endif


#include "discretespline.frag"
uniform int uR8;
BEGIN_PARAMS
	INPUT0(vec4, fPosition)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 pos = (fPosition / fPosition.w).xyz;
	
	//early out if we're not in the bounding box of the curve
	vec3 inBounds = step(uBoundsMin, pos + uRadius * 1.5f) * step(pos - uRadius * 1.5, uBoundsMax);
//	if(dot(inBounds, inBounds) < 2.9)
//	{ discard; }

	int firstSeg = uFirstSegment;
	int lastSeg = uFirstSegment + uNumSegments - 1;
#ifdef CACHE_READ
	uint bx = (int)(IN_POSITION.x*(float)uCacheSize/(float)uBufferSize.x);
	uint by = (int)(IN_POSITION.y*(float)uCacheSize/(float)uBufferSize.y);
	uint cacheCoord = bx + by * uCacheSize;
	uint2 sparseData = interlockedLoad2(bSegmentCache, cacheCoord*2);
	firstSeg = sparseData.x + uFirstSegment;
	lastSeg = sparseData.y + uFirstSegment;
#endif


	float radiusMult = 2.0;
	SegmentResult result = findBestSegment(pos, radiusMult, firstSeg, lastSeg);
	Segment seg;
	int bestSeg = -1;
	vec2 uv = vec2(0.5, 0.5);
	
	if(result.segNum != -1)
	{
		seg = result.seg;
		bestSeg = result.segNum;
		uv = result.splineUV;
	}
	
	float val = (float)(bestSeg+1) / mix(65535.0, 255.0, (float)uR8);

#ifdef SPLINE_FILL_PASS
	//uv.x = (uv.x-0.5) * radiusMult + 0.5;	//adjust UV to account for the radiusMult above
	float duv = length(dFdx(uv)+dFdy(uv));
	
	float sdf = (uv.x * 2.0 - 1.0);
	sdf = mix(sdf, -sdf, (float)seg.rightHanded);

	if(bestSeg == -1)// || abs(uv.x-0.5) > 0.5)	
	{ discard; }


#ifdef CACHE_WRITE
	//fill in min/max segment data
	uint bx = (int)(IN_POSITION.x*(float)uCacheSize/(float)uBufferSize.x);
	uint by = (int)(IN_POSITION.y*(float)uCacheSize/(float)uBufferSize.y);
	uint cacheCoord = bx + by * uCacheSize;
	uint prev;
	interlockedMin(bSegmentCache, cacheCoord*2, bestSeg-uFirstSegment, prev);
	interlockedMax(bSegmentCache, cacheCoord*2+1, bestSeg-uFirstSegment, prev);
#endif

	if(sdf <= 0.0 || result.alpha < 5.0/255.0)  //completely outside the filled spline and its border.  Or very low alpha.  must be black.
	{ OUT_COLOR0 = vec4(0.0, 0.0, 0.0, 1.0); return; }
	
//	if(sdf < 0.0)
//	{ discard; }
#ifdef SPLINE_FILL_SDF

	//reserve 4 bits for flags
	if((uFlags & 1) != 0)		//if this shape will draw without contour, set the SDF to 1
	{ sdf = 1.0; }
	int iv = (int)(saturate(sdf) * (65535.0));
	iv &= 0xFFF0;
	int AA = (int)(floor(saturate(result.alpha) * 16.0 + 0.5));	//1-16	(if zero we wouldn't be here)
	AA = max(AA-1, 0);	//AA is output 1-16, change to 0-15 for 4-bit encoding
	iv += AA & 15;
	val = saturate((float)iv/65535.0);
#endif

//	val = uv.x;
#endif
	OUT_COLOR0 = vec4(val, val, val, 1.0);


}

