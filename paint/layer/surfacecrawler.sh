#ifndef GPU_EDGE_CRAWLER
#define GPU_EDGE_CRAWLER

#include "../../common/octpack.sh"

#define MAX_CRAWL_STEPS 1024

struct SrcTriangleUVs
{
	vec2    uv0, uv1, uv2;
    uint    tangent0, normal0;
    uint	tangent1, normal1;
    uint	tangent2, normal2;
};

struct SrcTriNeighbors
{
    packed_vec3        p0;
    int                neighbor0;
    packed_vec3        p1;
    int                neighbor1;
    packed_vec3        p2;
    int                neighbor2;
};

USE_STRUCTUREDBUFFER(SrcTriNeighbors,bTrianglePosNeighbors);
USE_STRUCTUREDBUFFER(SrcTriangleUVs,bTriangleUVs);

struct	ShaderTriangleUVs
{
	vec2	uv0, uv1, uv2;
	vec3	tangents[3];
	vec3	bitangents[3];
	vec3	normals[3];
};

struct	ShaderTrianglePosNeighbors
{
	vec3	p0, p1, p2;
	int		neighbor0, neighbor1, neighbor2;
	uint3	neighborEdges;
};

ShaderTriangleUVs	getShaderTriangleUVs( uint triangleIndex )
{
	SrcTriangleUVs srcVal = bTriangleUVs[triangleIndex];
	
	ShaderTriangleUVs t;
	t.uv0 = srcVal.uv0;
	t.uv1 = srcVal.uv1;
	t.uv2 = srcVal.uv2;

	t.tangents[0] = unpackUnitVectorOct24bit( srcVal.tangent0 );
	t.normals[0] = unpackUnitVectorOct24bit( srcVal.normal0 >> 1 );
	t.bitangents[0] = normalize( cross( t.normals[0], t.tangents[0] ) );
	t.bitangents[0] = (srcVal.normal0 & 1) ? t.bitangents[0] : -t.bitangents[0];

	t.tangents[1] = unpackUnitVectorOct24bit( srcVal.tangent1 );
	t.normals[1] = unpackUnitVectorOct24bit( srcVal.normal1 >> 1 );
	t.bitangents[1] = normalize( cross( t.normals[1], t.tangents[1] ) );
	t.bitangents[1] = (srcVal.normal1 & 1) ? t.bitangents[1] : -t.bitangents[1];

	t.tangents[2] = unpackUnitVectorOct24bit( srcVal.tangent2 );
	t.normals[2] = unpackUnitVectorOct24bit( srcVal.normal2 >> 1 );
	t.bitangents[2] = normalize( cross( t.normals[2], t.tangents[2] ) );
	t.bitangents[2] = (srcVal.normal2 & 1) ? t.bitangents[2] : -t.bitangents[2];

	return t;
}

ShaderTrianglePosNeighbors	getShaderTrianglePosNeighbors( uint triangleIndex )
{
	SrcTriNeighbors srcVal = bTrianglePosNeighbors[triangleIndex];

	ShaderTrianglePosNeighbors t;
	t.p0 = srcVal.p0;
	t.p1 = srcVal.p1;
	t.p2 = srcVal.p2;
	t.neighborEdges = uint3(0,0,0);

	t.neighbor0 = srcVal.neighbor0;
	if( t.neighbor0 >= 0 )
	{
		t.neighborEdges.x = t.neighbor0 & 3;
		t.neighbor0 >>= 2;
	}

	t.neighbor1 = srcVal.neighbor1;
	if( t.neighbor1 >= 0 )
	{
		t.neighborEdges.y = t.neighbor1 & 3;
		t.neighbor1 >>= 2;
	}

	t.neighbor2 = srcVal.neighbor2;
	if( t.neighbor2 >= 0 )
	{
		t.neighborEdges.z = t.neighbor2 & 3;
		t.neighbor2 >>= 2;
	}

	return t;
}

float distanceFromEdgeUV( vec2 uv, vec2 edgeUV, vec2 edgeNormal )
{
	float dx = uv.x - edgeUV.x;
	float dy = uv.y - edgeUV.y;
	float result = ( dx * edgeNormal.x ) + ( dy * edgeNormal.y );
	return result;
}

float percentBetweenEndpointsUV( vec2 uv, vec2 edgeUVA, vec2 edgeUVB, float edgeLength )
{
	vec2 edgeDir = (edgeUVB-edgeUVA)/edgeLength;

	float dx1 = uv.x - edgeUVA.x;
	float dy1 = uv.y - edgeUVA.y;
	float d1 = ( dx1 * edgeDir.x ) + ( dy1 * edgeDir.y );
	if( d1 == 0 )
	{ return 0; }

	float dx2 = uv.x - edgeUVB.x;
	float dy2 = uv.y - edgeUVB.y;
	float d2 = -(( dx2 * edgeDir.x ) + ( dy2 * edgeDir.y ));

	if( d2 == 0 )
	{ return 1; }
	return d1 / (d1 + d2);
}

int nearestEdgeUV( vec2 uv, ShaderTriangleUVs triangleUVs )
{
	vec2 edgeUV0 = triangleUVs.uv1 - triangleUVs.uv0;
	vec2 edgeUV1 = triangleUVs.uv2 - triangleUVs.uv1;
	vec2 edgeUV2 = triangleUVs.uv0 - triangleUVs.uv2;
	vec2 edgeNormal0 = normalize(vec2(edgeUV0.y, -edgeUV0.x));
	vec2 edgeNormal1 = normalize(vec2(edgeUV1.y, -edgeUV1.x));
	vec2 edgeNormal2 = normalize(vec2(edgeUV2.y, -edgeUV2.x));
	float d0 = abs(distanceFromEdgeUV( uv, triangleUVs.uv0, edgeNormal0 ));
	float d1 = abs(distanceFromEdgeUV( uv, triangleUVs.uv1, edgeNormal1 ));
	float d2 = abs(distanceFromEdgeUV( uv, triangleUVs.uv2, edgeNormal2 ));
	if( d0 <= d1 && d0 <= d2 )
	{
		return 0;
	}
	else if( d1 <= d0 && d1 <= d2 )
	{
		return 1;
	}
	return 2;
}

vec3 getTriangleLerp( vec3 percentAcrossAndOffset01, vec3 percentAcrossAndOffset12, vec3 percentAcrossAndOffset20 )
{
	vec3 result = vec3(0,0,0);

	float edgeDiff01 = abs(percentAcrossAndOffset01.y);
	float edgeDiff12 = abs(percentAcrossAndOffset12.y);
	float edgeDiff20 = abs(percentAcrossAndOffset20.y);

	//as any approach 0, the influence of the others is reduced
	float weight01 = edgeDiff12*edgeDiff20;
	float weight12 = edgeDiff01*edgeDiff20;
	float weight20 = edgeDiff01*edgeDiff12;

	float totalWeights = weight01 + weight12 + weight20;
	float edgePercent01 = weight01 / totalWeights;
	float edgePercent12 = weight12 / totalWeights;
	float edgePercent20 = weight20 / totalWeights;
	vec3 cornerWeights = vec3(0,0,0);

	cornerWeights.x += (1.0f-percentAcrossAndOffset01.x)*edgePercent01;
	cornerWeights.y += (percentAcrossAndOffset01.x)*edgePercent01;
	cornerWeights.y += (1.0f-percentAcrossAndOffset12.x)*edgePercent12;
	cornerWeights.z += (percentAcrossAndOffset12.x)*edgePercent12;
	cornerWeights.z += (1.0f-percentAcrossAndOffset20.x)*edgePercent20;
	cornerWeights.x += (percentAcrossAndOffset20.x)*edgePercent20;

	float totalCornerWeights = cornerWeights.x + cornerWeights.y + cornerWeights.z;
	cornerWeights /= totalCornerWeights;
	result = cornerWeights;
	return result;
}

int getTriangleUVWinding( ShaderTriangleUVs triangleUVs )
{
	return ((triangleUVs.uv1.y-triangleUVs.uv0.y) * (triangleUVs.uv2.x-triangleUVs.uv0.x)) + (-(triangleUVs.uv1.x-triangleUVs.uv0.x) * (triangleUVs.uv2.y-triangleUVs.uv0.y)) < 0 ? 1 : -1;
}

vec3 getTriangleFlatNormal( ShaderTrianglePosNeighbors trianglePosNeighbors )
{
	vec3 triNormal;
	vec3 edgeDirA = trianglePosNeighbors.p1.xyz - trianglePosNeighbors.p0.xyz;
	vec3 edgeDirB = trianglePosNeighbors.p2.xyz - trianglePosNeighbors.p1.xyz;
	vec3 edgeDirC = trianglePosNeighbors.p0.xyz - trianglePosNeighbors.p2.xyz;
	triNormal.x = (edgeDirA.y * edgeDirB.z) - (edgeDirA.z * edgeDirB.y);
	triNormal.y = (edgeDirA.z * edgeDirB.x) - (edgeDirA.x * edgeDirB.z);
	triNormal.z = (edgeDirA.x * edgeDirB.y) - (edgeDirA.y * edgeDirB.x);
	return normalize(-triNormal);
}

float percentBetweenEndpoints3D( vec3 pos, vec3 edgePosA, vec3 edgePosB)
{
	vec3 edgeDir = normalize(edgePosB-edgePosA);

	float dx1 = pos.x - edgePosA.x;
	float dy1 = pos.y - edgePosA.y;
	float dz1 = pos.z - edgePosA.z;
	float d1 = ( dx1 * edgeDir.x ) + ( dy1 * edgeDir.y ) + ( dz1 * edgeDir.z );
	if( d1 == 0 )
	{ return 0; }

	float dx2 = pos.x - edgePosB.x;
	float dy2 = pos.y - edgePosB.y;
	float dz2 = pos.z - edgePosB.z;
	float d2 = -(( dx2 * edgeDir.x ) + ( dy2 * edgeDir.y ) + ( dz2 * edgeDir.z ));

	if( d2 == 0 )
	{ return 1; }
	return d1 / (d1 + d2);
}

float distanceFromEdge3D( vec3 pos, vec3 edgePos, vec3 edgeNormal )
{
	float dx = pos.x - edgePos.x;
	float dy = pos.y - edgePos.y;
	float dz = pos.z - edgePos.z;
	float result = ( dx * edgeNormal.x ) + ( dy * edgeNormal.y ) + ( dz * edgeNormal.z );
	return result;
}

vec3 getRelativePercentAndOffset3D( vec3 pos, vec3 edgePosA, vec3 edgePosB, vec3 triNormal )
{
	vec3 edge = edgePosB - edgePosA;
	vec3 edgeNormal;
	edgeNormal.x = (triNormal.y * edge.z) - (triNormal.z * edge.y);
	edgeNormal.y = (triNormal.z * edge.x) - (triNormal.x * edge.z);
	edgeNormal.z = (triNormal.x * edge.y) - (triNormal.y * edge.x);

	float edgeLength = sqrt((edge.x*edge.x)+(edge.y*edge.y)+(edge.z*edge.z));
	edgeNormal /= edgeLength;
	float percentAcross = percentBetweenEndpoints3D( pos, edgePosA, edgePosB);
	float distanceAway = distanceFromEdge3D( pos, edgePosA, edgeNormal );
	vec3 result;
	result.x = percentAcross;
	result.y = distanceAway / edgeLength;
	result.z = abs(distanceAway);
	return result;
}


int nearestExitingEdge( float percentToEdge0, float percentToEdge1, float percentToEdge2 )
{
	bool insideEdge0 = percentToEdge0 < 0;
	bool insideEdge1 = percentToEdge1 < 0;
	bool insideEdge2 = percentToEdge2 < 0;

	if( insideEdge0 && insideEdge1 && insideEdge2 )
	{ return -1; }
	else if( !insideEdge0 && insideEdge1 && insideEdge2 )
	{ return 0; }
	else if( insideEdge0 && !insideEdge1 && insideEdge2 )
	{ return 1; }
	else if( insideEdge0 && insideEdge1 && !insideEdge2 )
	{ return 2; }
	else if( insideEdge0 && !insideEdge1 && !insideEdge2 )
	{
		if( percentToEdge1 < percentToEdge2 )
		{ return 1; }
		return 2;
	}
	else if( !insideEdge0 && insideEdge1 && !insideEdge2 )
	{
		if( percentToEdge0 < percentToEdge2 )
		{ return 0; }
		return 2;
	}
	else if( !insideEdge0 && !insideEdge1 && insideEdge2 )
	{
		if( percentToEdge0 < percentToEdge1 )
		{ return 0; }
		return 1;
	}
	return -1;
}

vec3 getRelativePercentAndOffsetUV( vec2 uv, vec2 edgeUVA, vec2 edgeUVB )
{
	vec2 edgeUV = edgeUVB - edgeUVA;
	vec2 edgeNormal = vec2(edgeUV.y, -edgeUV.x);
	float edgeLength = sqrt((edgeUV.x*edgeUV.x)+(edgeUV.y*edgeUV.y));
	edgeNormal /= edgeLength;
	float percentAcross = percentBetweenEndpointsUV( uv, edgeUVA, edgeUVB, edgeLength);
	float distanceAway = distanceFromEdgeUV( uv, edgeUVA, edgeNormal );
	vec3 result;
	result.x = percentAcross;
	result.y = distanceAway / edgeLength;
	result.z = abs(distanceAway);
	return result;
}

vec3 getMidPoint3D( float percent, vec3 edgePosA, vec3 edgePosB )
{
	vec3 result = (edgePosA * (1.0f - percent)) + ( edgePosB * percent );
	return result;
}

vec3 projectCoordinate3D( vec3 edgePosA, vec3 edgePosB, vec3 triNormal, float percentAcross, float offset )
{
	vec3 edge = edgePosB - edgePosA;
	vec3 edgeNormal;
	edgeNormal.x = (triNormal.y * edge.z) - (triNormal.z * edge.y);
	edgeNormal.y = (triNormal.z * edge.x) - (triNormal.x * edge.z);
	edgeNormal.z = (triNormal.x * edge.y) - (triNormal.y * edge.x);

	vec3 midPointAlongEdge = getMidPoint3D( percentAcross, edgePosA, edgePosB );
	vec3 offsetFromEdge = edgeNormal * offset;
	vec3 result = midPointAlongEdge + offsetFromEdge;
	return result;
}


vec3 convertUVEdgeToPos( vec2 uv, ShaderTrianglePosNeighbors trianglePosNeighbors, ShaderTriangleUVs triangleUVs, int edge )
{
	vec2 edgeUVA;
	vec2 edgeUVB;
	vec3 edgePosA;
	vec3 edgePosB;
	if( edge == 0 )
	{
		edgeUVA = triangleUVs.uv0;
		edgeUVB = triangleUVs.uv1;
		edgePosA = trianglePosNeighbors.p0.xyz;
		edgePosB = trianglePosNeighbors.p1.xyz;
	}
	else if( edge == 1 )
	{
		edgeUVA = triangleUVs.uv1;
		edgeUVB = triangleUVs.uv2;
		edgePosA = trianglePosNeighbors.p1.xyz;
		edgePosB = trianglePosNeighbors.p2.xyz;
	}
	else
	{
		edgeUVA = triangleUVs.uv2;
		edgeUVB = triangleUVs.uv0;
		edgePosA = trianglePosNeighbors.p2.xyz;
		edgePosB = trianglePosNeighbors.p0.xyz;
	}
	int winding = getTriangleUVWinding( triangleUVs );
	vec3 triNormal = getTriangleFlatNormal( trianglePosNeighbors );
	vec3 percentAcrossAndOffsetUV = getRelativePercentAndOffsetUV( uv, edgeUVA, edgeUVB );
	vec3 projectedPos = projectCoordinate3D( edgePosA, edgePosB, triNormal, percentAcrossAndOffsetUV.x, percentAcrossAndOffsetUV.y*winding );
	return projectedPos;
}

//given some start/end points - identify the percent to the edge intersection
//provided that:
// - the start point is on the inside of the edge
// - the end point is on the outside of the edge
float percentToEdgeOutsideV( vec3 start, vec3 end, vec3 edgeA, vec3 edgeB, vec3 triNormal )
{
	float percent = -1;
	vec3 eab = edgeB-edgeA;//edge along ab facing outwards
	vec3 dab;// = vec2(eab.y, -eab.x);//direction facing outwards

	dab.x = (triNormal.y * eab.z) - (triNormal.z * eab.y);
	dab.y = (triNormal.z * eab.x) - (triNormal.x * eab.z);
	dab.z = (triNormal.x * eab.y) - (triNormal.y * eab.x);

	vec3 pda = end-edgeA;//diffs from projected pos to corner
	vec3 oda = edgeA-start;//diffs from origin pos to corner

	float psa = (dab.x * pda.x) + (dab.y * pda.y) + (dab.z * pda.z);//outside distance from projected end

	if( psa > 0 )
	{
		float osa = (dab.x * oda.x) + (dab.y * oda.y) + (dab.z * oda.z);//inside distance from start origin
		osa = abs(osa);//catch those pesky edge pixels that are just slightly mathematically out of bounds as in -0.000001
		percent = osa / ( osa + psa );
	}
	return percent;
}

//uv version
float percentToEdgeOutsideUV( vec2 start, vec2 end, vec2 edgeA, vec2 edgeB )
{
	float percent = -1;
	vec2 eab = edgeB-edgeA;//edge along ab facing outwards
	vec2 dab = normalize(vec2(eab.y, -eab.x));//direction facing outwards

	vec2 pda = end-edgeA;//diffs from projected pos to corner
	vec2 oda = edgeA-start;//diffs from origin pos to corner

	float psa = (dab.x * pda.x) + (dab.y * pda.y);//outside distance from projected end

	if( psa > 0 )
	{
		float osa = (dab.x * oda.x) + (dab.y * oda.y);//inside distance from start origin
		osa = abs(osa);//catch those pesky edge pixels that are just slightly mathematically out of bounds as in -0.000001
		percent = osa / ( osa + psa );
	}
	return percent;
}

struct SurfaceCrawlResultV
{
	vec3 posActual;
	vec2 uvActual;
	float primaryEdgeDot;
	bool finalHit;
	bool truncated;
	int triangleIndex;
};

vec3 projectCoordinateNextTriangle( vec3 pos, vec3 localEdgeA, vec3 localEdgeB, vec3 nextEdgeA, vec3 nextEdgeB, vec3 triNormal, vec3 nextTriNormal )
{
	vec3 percentAcrossAndOffset3D = getRelativePercentAndOffset3D( pos, localEdgeA, localEdgeB, triNormal );
	vec3 projectedPos = projectCoordinate3D( nextEdgeB, nextEdgeA, nextTriNormal, percentAcrossAndOffset3D.x, percentAcrossAndOffset3D.y );
	return projectedPos;
}


//the first round is commented, the rest repeats with #included code snippet

SurfaceCrawlResultV crawlSurfaceMultipleV( vec3 sampleCoord, vec3 offset, unsigned int triangleIndex )
{

	SurfaceCrawlResultV resultV;
	resultV.finalHit = false;
	resultV.triangleIndex = triangleIndex;
	resultV.primaryEdgeDot = 0;
	resultV.truncated = false;
	float percentToEdge[3] = {-1,-1,-1};
	int crossedEdge = -1;
	int neighborIndex = -1;
	int entryEdge = -1;

	vec3 nextTriNormal;

	ShaderTrianglePosNeighbors trianglePosNeighbors =  getShaderTrianglePosNeighbors(triangleIndex);

	vec3 projectedCoord = resultV.posActual = sampleCoord + offset;

	vec3 triNormal = getTriangleFlatNormal( trianglePosNeighbors );
	
	float maxDistance = length(offset);
	float remainingDistance = maxDistance;
	float distanceCovered = 0;
	float percentToIntersection = 0;

	percentToEdge[0] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p0.xyz, trianglePosNeighbors.p1.xyz, triNormal );
	percentToEdge[1] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p1.xyz, trianglePosNeighbors.p2.xyz, triNormal );
	percentToEdge[2] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p2.xyz, trianglePosNeighbors.p0.xyz, triNormal );

	int cnt = MAX_CRAWL_STEPS;
	while( cnt > 0 )
	{

		//get nearest intersected edge
		crossedEdge = nearestExitingEdge( percentToEdge[0], percentToEdge[1], percentToEdge[2] );

		//if no intersections the endpoint is within the triangle
		if( crossedEdge == -1 )
		{
			//inside triangle
			resultV.finalHit = true;
		}
		else
		{
			vec3 localEdgeA;
			vec3 localEdgeB;
	
			//else check the edge for a neighbor or open edge
			if( crossedEdge == 0 )
			{ 
				neighborIndex = trianglePosNeighbors.neighbor0;
				percentToIntersection = percentToEdge[0];
				entryEdge = trianglePosNeighbors.neighborEdges.x;
				localEdgeA = trianglePosNeighbors.p0.xyz;
				localEdgeB = trianglePosNeighbors.p1.xyz;
			}
			else if( crossedEdge == 1 )
			{ 
				neighborIndex = trianglePosNeighbors.neighbor1;
				percentToIntersection = percentToEdge[1];
				entryEdge = trianglePosNeighbors.neighborEdges.y;
				localEdgeA = trianglePosNeighbors.p1.xyz;
				localEdgeB = trianglePosNeighbors.p2.xyz;
			}
			else//( crossedEdge == 2 )
			{ 
				neighborIndex = trianglePosNeighbors.neighbor2;
				percentToIntersection = percentToEdge[2];
				entryEdge = trianglePosNeighbors.neighborEdges.z;
				localEdgeA = trianglePosNeighbors.p2.xyz;
				localEdgeB = trianglePosNeighbors.p0.xyz;
			}

			//if no neighbor then truncate to edge
			if( neighborIndex == -1 )
			{
				//hit an open edge with no neighbor - avoid bleedover into dead space
				//truncate the projected uv to the end of the triangle
				resultV.posActual = sampleCoord + (offset * percentToIntersection * 0.9999f);
				distanceCovered = remainingDistance * percentToIntersection;
				remainingDistance = 0;
				resultV.finalHit = true;
				resultV.truncated = true;
			}
			else
			{
				//else continue with neighbor

				distanceCovered = remainingDistance * percentToIntersection;
				remainingDistance -= distanceCovered;
	
				trianglePosNeighbors = getShaderTrianglePosNeighbors(neighborIndex);

				nextTriNormal = getTriangleFlatNormal( trianglePosNeighbors );
				resultV.primaryEdgeDot = resultV.primaryEdgeDot == 0 ? dot(triNormal, nextTriNormal) : resultV.primaryEdgeDot;

				resultV.triangleIndex = neighborIndex;
	
				vec3 nextEdgeA;
				vec3 nextEdgeB;
				if( entryEdge == 0 )
				{
					nextEdgeA = trianglePosNeighbors.p0.xyz;
					nextEdgeB = trianglePosNeighbors.p1.xyz;
				}
				else if( entryEdge == 1 )
				{
					nextEdgeA = trianglePosNeighbors.p1.xyz;
					nextEdgeB = trianglePosNeighbors.p2.xyz;
				}
				else
				{
					nextEdgeA = trianglePosNeighbors.p2.xyz;
					nextEdgeB = trianglePosNeighbors.p0.xyz;
				}

				//project to new planar space
				sampleCoord = projectCoordinateNextTriangle( sampleCoord, localEdgeA, localEdgeB, nextEdgeA, nextEdgeB, triNormal, nextTriNormal );
				projectedCoord = projectCoordinateNextTriangle( projectedCoord, localEdgeA, localEdgeB, nextEdgeA, nextEdgeB, triNormal, nextTriNormal );
				resultV.posActual = projectedCoord;
				offset = projectedCoord - sampleCoord;
				triNormal = nextTriNormal;
			}
		}
		if( resultV.finalHit )
		{ cnt = 0; }
		else
		{
			if( entryEdge == 0 )
			{
				percentToEdge[0] = -1;
				percentToEdge[1] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p1.xyz, trianglePosNeighbors.p2.xyz, triNormal );
				percentToEdge[2] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p2.xyz, trianglePosNeighbors.p0.xyz, triNormal );
			}
			else if( entryEdge == 1 )
			{
				percentToEdge[0] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p0.xyz, trianglePosNeighbors.p1.xyz, triNormal );
				percentToEdge[1] = -1;
				percentToEdge[2] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p2.xyz, trianglePosNeighbors.p0.xyz, triNormal );
			}
			else //( entryEdge == 2 )
			{
				percentToEdge[0] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p0.xyz, trianglePosNeighbors.p1.xyz, triNormal );
				percentToEdge[1] = percentToEdgeOutsideV( sampleCoord, projectedCoord, trianglePosNeighbors.p1.xyz, trianglePosNeighbors.p2.xyz, triNormal );
				percentToEdge[2] = -1;
			}
		}
		cnt--;
	}

	vec3 percentAcrossAndOffset01 = getRelativePercentAndOffset3D( resultV.posActual, trianglePosNeighbors.p0.xyz, trianglePosNeighbors.p1.xyz, triNormal );
	vec3 percentAcrossAndOffset12 = getRelativePercentAndOffset3D( resultV.posActual, trianglePosNeighbors.p1.xyz, trianglePosNeighbors.p2.xyz, triNormal );
	vec3 percentAcrossAndOffset20 = getRelativePercentAndOffset3D( resultV.posActual, trianglePosNeighbors.p2.xyz, trianglePosNeighbors.p0.xyz, triNormal );
	vec3 triLerp = getTriangleLerp( percentAcrossAndOffset01, percentAcrossAndOffset12, percentAcrossAndOffset20 );

	ShaderTriangleUVs triangleUVs = getShaderTriangleUVs(resultV.triangleIndex);

	resultV.uvActual = (triangleUVs.uv0 * triLerp.x) + (triangleUVs.uv1 * triLerp.y) + (triangleUVs.uv2 * triLerp.z);
	
	return resultV;

}

//make perpendicular to surface normal
vec3 alignToSurface( vec3 normal, vec3 direction )
{
	vec3 result = direction - (normal * dot(normal, direction));
	return normalize(result)*length(direction);
}

SurfaceCrawlResultV crawlSurface( vec3 position, vec3 normal, vec3 offset, unsigned int triangleIndex )
{
	return crawlSurfaceMultipleV( position, alignToSurface(normal, offset), triangleIndex );
}

//use for padding
SurfaceCrawlResultV crawlAwayFromEdge( vec2 sampleCoord, vec2 offset, unsigned int triangleIndex )
{
	ShaderTrianglePosNeighbors trianglePosNeighbors = getShaderTrianglePosNeighbors(triangleIndex);
	ShaderTriangleUVs triangleUVs = getShaderTriangleUVs(triangleIndex);

	float percentToEdge[3] = {-1,-1,-1};
	percentToEdge[0] = percentToEdgeOutsideUV( sampleCoord, sampleCoord+offset, triangleUVs.uv0, triangleUVs.uv1 );
	percentToEdge[1] = percentToEdgeOutsideUV( sampleCoord, sampleCoord+offset, triangleUVs.uv1, triangleUVs.uv2 );
	percentToEdge[2] = percentToEdgeOutsideUV( sampleCoord, sampleCoord+offset, triangleUVs.uv2, triangleUVs.uv0 );
	int edge = nearestExitingEdge( percentToEdge[0], percentToEdge[1], percentToEdge[2] );
	vec3 pos = convertUVEdgeToPos( sampleCoord, trianglePosNeighbors, triangleUVs, edge );
	vec3 voffset = convertUVEdgeToPos( sampleCoord + offset, trianglePosNeighbors, triangleUVs, edge) - pos;
	SurfaceCrawlResultV sc = crawlSurfaceMultipleV( pos, voffset, triangleIndex );
	return sc;
}


///////////////////////////////////////////////////////////////
//misc. utility code



vec4 getTriangleLerpUV( vec2 uv, ShaderTriangleUVs triangleUVs, inout int edge )
{
	//TrianglePatch patch = bTrianglePatchTable[triangleIndex];
	vec3 percentAcrossAndOffset01 = getRelativePercentAndOffsetUV( uv, triangleUVs.uv0, triangleUVs.uv1 );
	vec3 percentAcrossAndOffset12 = getRelativePercentAndOffsetUV( uv, triangleUVs.uv1, triangleUVs.uv2 );
	vec3 percentAcrossAndOffset20 = getRelativePercentAndOffsetUV( uv, triangleUVs.uv2, triangleUVs.uv0 );
	vec4 result;
	result.xyz = getTriangleLerp( percentAcrossAndOffset01, percentAcrossAndOffset12, percentAcrossAndOffset20 );
	result.w = 0;
	edge = nearestEdgeUV( uv, triangleUVs );
	if( edge == 0 )
	{ result.w = result.y * result.z; }
	if( edge == 1 )
	{ result.w = result.x * result.z; }
	if( edge == 2 )
	{ result.w = result.x * result.y; }
	return result;
}

//fail-safe version - can go off triangle
vec3 uv2pos( vec2 uv, int triangleIndex )
{
	ShaderTrianglePosNeighbors trianglePosNeighbors = getShaderTrianglePosNeighbors(triangleIndex);
	ShaderTriangleUVs triangleUVs = getShaderTriangleUVs(triangleIndex);
	int edge = 0;
	vec4 triLerp = getTriangleLerpUV( uv, triangleUVs, edge );
	vec3 result = vec3(0,0,0);
	if( triLerp.w != 0 )
	{
		//within triangle - use standard high-precision trilerp
		result = (trianglePosNeighbors.p0.xyz * triLerp.x) + (trianglePosNeighbors.p1.xyz * triLerp.y) + (trianglePosNeighbors.p2.xyz * triLerp.z);
	}
	else
	{
		//exceeds triangle bounds, just project past the nearest edge
		result = convertUVEdgeToPos( uv, trianglePosNeighbors, triangleUVs, edge );
	}
	return result;
}

vec3	barycentricFromUV( ShaderTriangleUVs t, vec2 uv )
{
	//solves for 3 barycentric coordinates from a uv point inside triangle t.  -jdr
	vec2 v0 = t.uv1 - t.uv0, v1 = t.uv2 - t.uv0, v2 = uv - t.uv0;
	float den = v0.x * v1.y - v1.x * v0.y;
	vec3 b;
	// we're near 0, meaning at least of our edge is degenerated
	// just return the middle of the triangle
	if( abs( den ) < 1e-6 )
	{
		b = vec3( 0.3, 0.3, 0.4 );
	}
	else
	{
		b.y = (v2.x * v1.y - v1.x * v2.y) / den;
		b.z = (v0.x * v2.y - v2.x * v0.y) / den;
		b.x = 1.0 - b.y - b.z;
	}
	
	return b;
}

#endif
