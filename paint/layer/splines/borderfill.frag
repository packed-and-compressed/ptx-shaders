
uniform int		uNumSegments;
uniform int 	uFirstSegment;

#ifdef SPLINE_FILL_INTERIOR

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

//returns distance along ray
float raySegmentIntersectionDistanceOld(vec3 rayOrigin, vec3 rayDirNormalized, vec3 p0, vec3 p1)
{
	//get a vector perpendicular to the segment
	vec3 segPerp = cross(p1 - p0, rayOrigin - p0);
	segPerp = cross(segPerp, p1-p0);
	segPerp = normalize(segPerp);
	
	//now get the perpendicular distance
	float perpDist = dot(segPerp, (rayOrigin-p0));
	//float dist = segPerp.length();
	float perpDot = dot(rayDirNormalized, (segPerp * -1.f));
	if(perpDot < 0.001f) 
	{ return -1; }	//if the ray is going the wrong way, no intersection
	
	//find the point of intersection
	vec3 intersect = rayOrigin + rayDirNormalized * perpDist / perpDot;
	vec3 toIntersect = intersect - p0;
	if(length(toIntersect) > length(p1 - p0))
	{ return -1.f; }	//intersect point is past p1
	
	//make sure the intersect is definitely on the segment
	float intersectTime = dot((p1-p0), toIntersect) / dot(p1-p0, p1-p0);
	if(intersectTime < 0.0 || intersectTime > 1.0)
	{ return -1.f; }

	return perpDist/perpDot;
}
	
//returns distance along ray
float raySegmentIntersectionDistance(vec3 rayOrigin, vec3 rayDirNormalized, vec3 p0, vec3 p1, vec3 normal)
{
	float old = raySegmentIntersectionDistanceOld(rayOrigin, rayDirNormalized, p0, p1);
#if 0
	return old;
	
#else
	vec3 segPerp = normal;

	//ensure that the segment actually crosses the ray
	vec3 rayPerp = normalize(cross(segPerp, rayDirNormalized));	
	float segRayDist1 = dot(rayPerp, (rayOrigin-p1));
	float segRayDist0 = dot(rayPerp, (rayOrigin-p0));
	if(segRayDist1 * segRayDist0 > 0.0)
	{ return -1.f; }
	
	float segT = (abs(segRayDist0)/(abs(segRayDist1)+abs(segRayDist0)));
	vec3 hit = mix(p0, p1, segT);
	float dd = dot(hit - rayOrigin, rayDirNormalized); 
	return dot(hit - rayOrigin, rayDirNormalized);
#endif 
}

bool pointInsideTri(vec3 p, vec3 p0, vec3 p1, vec3 p2, vec3 norm)
{
		vec3 perp1 = cross(p1-p0, p-p0);
		vec3 perp2 = cross(p2-p1, p-p1);
		vec3 perp3 = cross(p0-p2, p-p2);
//		return (dot(norm, perp1) >= 0.0 && dot(norm, perp2) > 0.0 && dot(norm, perp3) > 0.0);
		return (dot(perp1, perp2) >= 0.0) == (dot(perp3, perp2) >= 0.0) && (dot(perp1, perp2) >= 0.0) == (dot(perp3, perp1) >= 0.0);
}

vec3 posToBarycentric(vec3 p, vec3 p0, vec3 p1, vec3 p2)
{
	vec3 relativeIntersection;
	relativeIntersection.x = p.x-p0[0];
	relativeIntersection.y = p.y-p0[1];
	relativeIntersection.z = p.z-p0[2];
	
	vec3 edge1, edge2, n, ncrossu, ncrossv;
	edge1.x = p1.x-p0.x;
	edge1.y = p1.y-p0.y;
	edge1.z = p1.z-p0.z;
	edge2.x = p2.x-p0.x;
	edge2.y = p2.y-p0.y;
	edge2.z = p2.z-p0.z;
	
	n.x = edge1.y * edge2.z - edge1.z * edge2.y;
	n.y = edge1.z * edge2.x - edge1.x * edge2.z;
	n.z = edge1.x * edge2.y - edge1.y * edge2.x;
	
	ncrossv.x = n.y*edge2.z - n.z*edge2.y;
	ncrossv.y = n.z*edge2.x - n.x*edge2.z;
	ncrossv.z = n.x*edge2.y - n.y*edge2.x;
	
	float u = ( relativeIntersection.x*ncrossv.x+relativeIntersection.y*ncrossv.y+relativeIntersection.z*ncrossv.z ) /
				( edge1.x*ncrossv.x+edge1.y*ncrossv.y+edge1.z*ncrossv.z) ;
	
	ncrossu.x = n.y*edge1.z - n.z*edge1.y;
	ncrossu.y = n.z*edge1.x - n.x*edge1.z;
	ncrossu.z = n.x*edge1.y - n.y*edge1.x;
	float v = ( relativeIntersection.x*ncrossu.x+relativeIntersection.y*ncrossu.y+relativeIntersection.z*ncrossu.z ) /
				( edge2.x*ncrossu.x+edge2.y*ncrossu.y+edge2.z*ncrossu.z) ;
	vec3 result;
	result.x = 1.f - u - v;
	result.y = u;
	result.z = v;
	return result;
}

bool clipToTri(inout vec3 p0, inout vec3 p1, vec3 faceNormal)
{
	vec3 t0 = uTriCorners[0];
	vec3 t1 = uTriCorners[1];
	vec3 t2 = uTriCorners[2];
	
	//align to plane first
	p0 += faceNormal * dot((t0-p0), faceNormal);
	p1 += faceNormal * dot((t0-p1), faceNormal);
	
	//now clip
	float l = length(p1-p0);
	vec3 dir = (p1-p0) / max(l, 0.000001);
	
	//for inside/outside testing, use a slight bias to inside
	float eps = 0.000001 * max(length(t0-t1), max(length(t1-t2), length(t2-t0)));
	bool in0 = pointInsideTri(p0 + dir * eps, t0, t1, t2, faceNormal);
	bool in1 = pointInsideTri(p1 - dir * eps, t0, t1, t2, faceNormal);
	
	//the easiest early out.  Also important because otherwise we may adjust a point unnecessarily
	if(in0 && in1)
	{ return true; }
	//how many intersections?
	float d0 = raySegmentIntersectionDistance(p0, dir, t0, t1, faceNormal);
	float d1 = raySegmentIntersectionDistance(p0, dir, t1, t2, faceNormal);
	float d2 = raySegmentIntersectionDistance(p0, dir, t2, t0, faceNormal);
	int rayCrosses = (int)(d0 > eps ) + (int)(d1 > eps ) + (int)(d2 > eps );
	int segCrosses = (int)(d0 > eps && d0 < l) + (int)(d1 > eps && d1 < l) + (int)(d2 > eps && d2 < l);
	float dMost = max(d0, max(d1, d2));
	float dMin = min(d0, min(d1, d2));
	float dMid = d2;
	if(d0 < dMost && d0 > dMin)
	{ dMid = d0; }
	else if(d1 < dMost && d1 > dMin)
	{ dMid = d1; }
	
	if(segCrosses >= 2)		//both points outside, but line crosses the tri
	{
		float secondCross = dMost < l ? dMost : dMid;;
		float firstCross = dMost < l ? dMid : dMin;
		
		//only change points are not in the triangle
		p1 = mix(p0 + secondCross * dir, p1, (float)in1);
		p0 = mix(p0 + firstCross * dir, p0, (float)in0);
		 
	}
	else if(segCrosses == 1)	//one point is inside
	{
		float newDist = d0;
		if(d1 > eps && d1 < l)
		{ newDist = d1; }
		else if(d2 > eps && d2 < l)
		{ newDist = d2; }
		
		
		if(in0)
		{ p1 = p0 + newDist * dir; } 
		else					//p1 is inside--change p0
		{ p0 = p0 + newDist * dir; }
		
	}
	else		//no intersections.  Either all in or all out
	{  
		return in0 || in1;
	}
	return true;
}

//simpler checkSegment, just checks distance and sidedness.  Returns 0 if distance isn't better or we're not within the radius
int checkSegmentSimple(int segIndex, vec3 pos, vec3 faceNormal, inout float bestPerpDist, inout float tHit, inout SplineBorderSegment buffSeg, inout vec3 nearPos, float radiusMult, float dP, inout vec4 debugData)
{
	buffSeg = bSegmentData[segIndex-uFirstSegment];
	int i = segIndex;
	
	float s1DistSquared = dot((buffSeg.p1-pos.xyz), (buffSeg.p1-pos.xyz));
	if(s1DistSquared > (buffSeg.segLength + uRadius * radiusMult)*(buffSeg.segLength + uRadius * radiusMult))
	{ return 0; }
	//float eps = 0.00001 * bestPerpDistSquared;
	//float eps = 0.000001 * max(max(length(uTriCorners[0]-uTriCorners[1]), length(uTriCorners[1]-uTriCorners[2])), length(uTriCorners[0]-uTriCorners[2]));
	float eps = 0.008 * 0.012845232578665 * dP;
	//eps = 0.001 * uTestValue;
	//bounds check early out!
	vec3 mins = min(buffSeg.p1, buffSeg.p2);
	vec3 maxs = max(buffSeg.p1, buffSeg.p2);
	vec3 inBounds = step(mins, pos + uRadius * radiusMult) * step(pos - uRadius * radiusMult, maxs);
	if(dot(inBounds, inBounds) < 2.9)
	{ return 0; }

	//planarize immediately for consistency across segments
	buffSeg.p1 += faceNormal * dot((uTriCorners[0]-buffSeg.p1.xyz), faceNormal);
	buffSeg.p2 += faceNormal * dot((uTriCorners[0]-buffSeg.p2.xyz), faceNormal);
	float t = 1.0;
	float dSquared = pointSegmentDistanceSquared(pos, buffSeg.p1, buffSeg.p2, t);
	float d = sqrt(dSquared);
	float dt = length(vec2(dFdx(t), dFdy(t)));
	float better = (float)((d - bestPerpDist) < eps);
	//if(better == 0.0)
	//{ return 0; }
	float segT = t;
	vec3 p1 = buffSeg.p1;
	vec3 p2 = buffSeg.p2;
	bool onTri = clipToTri(p1, p2, faceNormal);
	buffSeg.p1 = p1;
	buffSeg.p2 = p2;
	dSquared = pointSegmentDistanceSquared(pos, buffSeg.p1, buffSeg.p2, t);	//make sure we have this
	d = sqrt(dSquared);
	//check distance improvement again after clipping.  This is our real distance
	better = (float)((d - bestPerpDist) < eps);
	if(better == 0.0 || !onTri)
	{ return 0; }

	nearPos = mix(buffSeg.p1, buffSeg.p2, saturate(t));
	vec3 toP = pos-buffSeg.p1;
	vec3 posCross = cross(toP, buffSeg.p2-buffSeg.p1);
	tHit = saturate(segT);
	bestPerpDist = d;
	buffSeg.segLength = distance(buffSeg.p1, buffSeg.p2);
	//return 1 if we're on the "right" side of the segment, otherwise -1
	if((dot(posCross, faceNormal) > 0) != buffSeg.rightHanded)
	{ return 1; }
	return -1;
}
#endif

#ifdef SPLINE_FILL_INTERIOR
int findBestSegmentSimple(vec3 pos, vec3 faceNormal, inout bool insideHand, float radiusMult, int firstSeg, int lastSeg, inout vec4 debugData)
{
	float dP = length(dFdx(pos) + dFdy(pos));	//used for epsilons/fudge factors
	//always widen our search range by 1 on each side because we need to consider both sides of a miter
	if(lastSeg != uFirstSegment+uNumSegments-1 || firstSeg != uFirstSegment)
	{
		firstSeg--;
		lastSeg++;
	}
	
	vec2 segUV;
	SplineBorderSegment testSeg;
	float bestDist = uRadius * radiusMult;
	float tHit = -1.0;

	int best = -1;
	vec3 segDir = vec3(0.0, 0.0, 0.0);
	vec3 nearPos = vec3(999999.0, 999999.0, 99999.0);
	int firstBufferIndex = uTriSegListStart;
	int bufferIndexCount = uTriSegListCount;
	int firstBufferSeg = bTriSegmentList[firstBufferIndex];
	int lastBufferSeg = bTriSegmentList[firstBufferIndex+bufferIndexCount-1];
	for(int index = 0; index < bufferIndexCount; index++)
	{
		int i = bTriSegmentList[index+firstBufferIndex];//(index-uFirstSegment+uNumSegments)%uNumSegments+uFirstSegment;	//wrap to our working range
		float lastBestDist = bestDist;
		vec3 lastNearPos = nearPos;
		vec3 lastSegDir = segDir;
		float lastTHit = tHit;
		int result = checkSegmentSimple(i, pos, faceNormal, bestDist, tHit, testSeg, nearPos, radiusMult, dP, debugData);
		if(result != 0)
		{
			//things can be tricky near corners, so do a couple checks to determine if hit the "closest" spot on
			//two adjacent segments.  In this case, both hit points will be nearly identical and the hit t-values
			//will be nearly opposite (1 and 0)
			bool adjacentSegments = testSeg.prevSegment == best-uFirstSegment || testSeg.nextSegment == best-uFirstSegment; 
			float cornerWrap = (testSeg.nextSegment == best-uFirstSegment) ? -1.0 : 1.0;
			float cornerness = (lastTHit-tHit) * cornerWrap;
			float pointProximity = length(nearPos-lastNearPos);
			segDir = (testSeg.p2-testSeg.p1)/max(0.000001, testSeg.segLength);
			float proximityMult = 0.5 * (1.0-dot(segDir, lastSegDir)) + 0.1;	//sharper angles have more forgiveness here
			bool samePoint = (pointProximity < dP * proximityMult) && cornerness > 0.90 && adjacentSegments;
			
			best = i;

			//in interior fill phase, sharp corners often create regions where the sample point is the same distance from
			//two segments (due to the common endpoint) but the sidedness differs, which can give us an incorrect inside-or-outisde result
			//What seems to work is:  for outside corners, if one of the two fails the other one should fail (&&).  For inside corners,
			// if one of the two is on the correct side, the other should also pass (||).
			vec3 dirX = cross (lastSegDir, segDir) * cornerWrap;
			vec3 testX = faceNormal;
			bool badVec = (dot(segDir, segDir) == 0.0 || dot(lastSegDir, lastSegDir) == 0.0);
			bool insideAngle = !badVec && testSeg.rightHanded == (dot(dirX, testX) < 0.0);
			
			if(samePoint && !insideAngle)
			{ insideHand = insideHand && (result == 1); }
			else if(samePoint && insideAngle)
			{ insideHand = insideHand || (result == 1); }
			else
			{ insideHand = (result == 1); }
			
		}
	}

	return best;
	
}
#endif //SPLINE_FILL_INTERIOR

