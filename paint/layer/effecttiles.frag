#include "effect.frag"

#include "effectutil.frag"
#include "../../common/util.sh"
#include "gradientmap.frag"

uniform float	uContrast;
uniform float	uScale;
uniform float	uOffset;
uniform float	uBlockUVTiling;
uniform float	uBorderU;
uniform float	uBorderV;
uniform float	uBorderW;
uniform float	uBorderDepth;

uniform float	uBorderShadowDepth;
uniform float	uBorderShadowLength;

uniform float	uRandomRotation;
uniform float	uBlockRotX;
uniform float	uBlockRotY;
uniform float	uBlockRotZ;
uniform float	uBlockRollX;
uniform float	uBlockRollY;
uniform float	uBlockRollZ;

uniform float	uRandomScale;
uniform float	uRandomDepth;

uniform float	uUnitWidth;
uniform float	uUnitHeight;

uniform float	uUnitDepthOffset;

uniform int		uInvertEffect;

uniform float	uBevelDepth;
uniform float	uBevelWidth;
uniform float	uBevelRoundness;
uniform float	uCornerRoundness;

uniform float	uProjectionOffset;

uniform vec4	uTileColor;
uniform vec4	uBevelColor;
uniform vec4	uGroutColor;
uniform vec4	uShadowColor;

uniform int		uRandomSeedValue;


struct BlockInfo
{
	vec3 lo;
	vec3 hi;
	vec4 randomTileVec;
	mat4 blockTransform;
	vec3 originalCoordinates;
	vec3 depthProjectionStartPos;
	vec3 depthProjectionEndPos;
	vec3 depthProjectionVector;
};


vec3 getPlanarPercents(vec3 pxyz, BlockInfo block)
{
	vec3 result;
	result.x = (pxyz.x - block.lo.x) / (block.hi.x-block.lo.x);
	result.y = (pxyz.y - block.lo.y) / (block.hi.y-block.lo.y);
	result.z = (pxyz.z - block.lo.z) / (block.hi.z-block.lo.z);
	return result;
}


vec3 gradient3D(int x, int y, int z)
{
	vec3 inputSin;
	inputSin.x = sin((float)x + uRandomSeedValue);
	inputSin.y = sin((float)y + uRandomSeedValue);
	inputSin.z = sin((float)z + uRandomSeedValue);

	vec3 vecX;
	vec3 vecY;
	vec3 vecZ;
	vecX.x = 12.989;
	vecX.y = 78.233;
	vecX.z = 37.719;
	vecY.x = 39.346;
	vecY.y = 11.135;
	vecY.z = 83.155;
	vecZ.x = 73.156;
	vecZ.y = 52.235;
	vecZ.z = 9.151;

	vec3 result;
	result.x = frac(sin(dot(inputSin, vecX)) * 143758.5453);
	result.y = frac(sin(dot(inputSin, vecY)) * 143758.5453);
	result.z = frac(sin(dot(inputSin, vecZ)) * 143758.5453);
	return result;
}

vec4 getRandomTileValues(float x, float y)
{
	float seed = 0;

	x = (int)x;
	y = (int)y;

	x = fmod(x, uScale / uUnitWidth);
	y = fmod(y, uScale / uUnitHeight);

	vec3 randomGradient = gradient3D((int)x, (int)y, 0);

	if( randomGradient.x < 0 ) randomGradient.x *= -1;
	if( randomGradient.y < 0 ) randomGradient.y *= -1;
	if( randomGradient.z < 0 ) randomGradient.z *= -1;

	vec4 result;

	result.xyz = randomGradient;
	result.w = mod(randomGradient.x + randomGradient.y + randomGradient.z, 1);

	return result;
}


float percentBetweenValues(float lo, float hi, float value)
{
	float diff1 = value-lo;
	float diff2 = hi-value;
	if( diff1 >= 0 && diff2 >= 0 ) return diff1 / (diff1+diff2);
	if( diff1 < 0 ) return diff1;
	return 1.0f+diff2;
}

vec2 planeUVs(BlockInfo block, vec3 pos, int planeAxis)
{
	vec2 result = vec2(0,0);
	if( planeAxis == 0 )
	{
		result.x = percentBetweenValues(block.lo.y, block.hi.y, pos.y);
		result.y = percentBetweenValues(block.lo.z, block.hi.z, pos.z);
	}
	else if( planeAxis == 1 )
	{
		result.x = percentBetweenValues(block.lo.x, block.hi.x, pos.x);
		result.y = percentBetweenValues(block.lo.z, block.hi.z, pos.z);
	}
	else
	{
		result.x = percentBetweenValues(block.lo.x, block.hi.x, pos.x);
		result.y = percentBetweenValues(block.lo.y, block.hi.y, pos.y);
	}
	return result;
}

float getDistanceFromRoundedSides(BlockInfo block, vec3 pos)
{
	vec3 pxyz = getPlanarPercents(pos, block);

	float blockWidth = block.hi.x - block.lo.x;
	float blockHeight = block.hi.y - block.lo.y;

	float px = pxyz.x;
	float py = pxyz.y;

	float posx = pos.x;
	float posy = pos.y;

	float cornerlox = block.lo.x + uCornerRoundness;
	float cornerloy = block.lo.y + uCornerRoundness;
	float cornerhix = block.hi.x - uCornerRoundness;
	float cornerhiy = block.hi.y - uCornerRoundness;
	float cornerx = cornerlox;
	float cornery = cornerloy;

	if( px > 0.5f ) cornerx = cornerhix;
	if( py > 0.5f ) cornery = cornerhiy;

	float sideDist = 0;

	bool withinx = posx >= cornerlox && posx <= cornerhix;
	bool withiny = posy >= cornerloy && posy <= cornerhiy;

	if( withinx && withiny )
	{
		float xdist = 0;
		float ydist = 0;
		if( px < 0.5f ) xdist = posx-block.lo.x;
		else xdist = block.hi.x-posx;
		if( py < 0.5f ) ydist = posy-block.lo.y;
		else ydist = block.hi.y-posy;
		if( xdist < ydist ) sideDist = -xdist;
		else sideDist = -ydist;
	}
	else if( withinx )
	{
		if( py < 0.5f ) sideDist = block.lo.y - posy;
		else sideDist = posy-block.hi.y;
	}
	else if( withiny )
	{
		if( px < 0.5f ) sideDist = block.lo.x - posx;
		else sideDist = posx-block.hi.x;
	}
	else
	{
		float dx = posx - cornerx;
		float dy = posy - cornery;
		float dist = sqrt((dx*dx)+(dy*dy));
		sideDist = dist - uCornerRoundness;
	}

	return sideDist;
}

vec3 getClosestNormalFromRoundedSides(BlockInfo block, vec3 pos)
{
	vec3 pxyz = getPlanarPercents(pos, block);

	float blockWidth = block.hi.x - block.lo.x;
	float blockHeight = block.hi.y - block.lo.y;

	float px = pxyz.x;
	float py = pxyz.y;

	float posx = pos.x;
	float posy = pos.y;

	float cornerlox = block.lo.x + uCornerRoundness;
	float cornerloy = block.lo.y + uCornerRoundness;
	float cornerhix = block.hi.x - uCornerRoundness;
	float cornerhiy = block.hi.y - uCornerRoundness;
	float cornerx = cornerlox;
	float cornery = cornerloy;

	if( px > 0.5f ) cornerx = cornerhix;
	if( py > 0.5f ) cornery = cornerhiy;

	float sideDist = 0;

	vec3 result = vec3(0,0,0);

	bool withinx = posx >= cornerlox && posx <= cornerhix;
	bool withiny = posy >= cornerloy && posy <= cornerhiy;

	if( withinx && withiny )
	{
		float xdiff = 0.5f - px;
		float ydiff = 0.5f - py;
		if( xdiff < 0 ) xdiff = -xdiff;
		if( ydiff < 0 ) ydiff = -ydiff;
		if( xdiff < ydiff )
		{
			if( px < 0.5f ) result.x = -1;
			else result.x = 1;
		}
		else
		{
			if( py < 0.5f ) result.y = -1;
			else result.y = 1;
		}
	}
	else if( withinx )
	{
		if( py < 0.5f ) result.y = -1;
		else result.y = 1;
	}
	else if( withiny )
	{
		if( px < 0.5f ) result.x = -1;
		else result.x = 1;
	}
	else 
	{
		float dx = posx - cornerx;
		float dy = posy - cornery;
		float dist = sqrt((dx*dx)+(dy*dy));
		result.x = dx/dist;
		result.y = dy/dist;
	}

	return result;
}


float getFrontBevelPercent(BlockInfo block, vec3 position)
{
	float distFromEdge = -getDistanceFromRoundedSides(block, position);

	float scaled = distFromEdge / uBevelWidth;

	return scaled;
}

float scaleTopPlanarDistance(BlockInfo block, float pdist, vec3 pnormal)
{
	vec3 normal = mulVec( block.blockTransform, pnormal);
	float zdiff = normal.z;
	if( zdiff < 0 ) zdiff = -zdiff;

	float tx = normal.x;
	float ty = normal.y;

	float xylen = sqrt((tx*tx)+(ty*ty));

	if( xylen == 0 ) xylen = 0.000001f;

	float scale = zdiff/xylen;

	return pdist * scale;
}

//fast shadow distance from nearby surface intersection - works up to a point..
//find the nearest surface in 3d space - then scale according to relative tilt..
//(increase the distance to infinity as the plane moves parallel to the Z surface)

//generally ok for rounded block sides or submerged front faces - gets fuzzy/
//ambiguous with extruded bevels space (trying to avoid a full geometric solution)..

float getDistanceFromSubmergedBlockSilhouette(BlockInfo block, vec3 pos)
{

	float bevelSpace = uBevelDepth * uBevelWidth;
	float bevelTop = block.hi.z + bevelSpace;

	float dz = pos.z - bevelTop;

	vec3 sideNormal = getClosestNormalFromRoundedSides(block, pos);
	float distFromEdge = getDistanceFromRoundedSides(block, pos);


	float bevelHeightPercent = 0;

	if( pos.z >= block.hi.z )
	{
		bevelHeightPercent = (pos.z-block.hi.z) / bevelSpace;
	}

	bool flipZ = pos.z < block.lo.z;
	if( flipZ ) dz = block.lo.z - pos.z;

	//offset the side distance to match the bevel
	if( bevelHeightPercent != 0 )
	{
		if( bevelHeightPercent > 1 ) bevelHeightPercent = 1;
		float offsetAmount = uBevelWidth * bevelHeightPercent;
		distFromEdge += offsetAmount;
		dz += (bevelSpace * (1.0f-bevelHeightPercent));
	}

	if( distFromEdge <= 0 && dz < 0 ) return 0;//inside block

	//grr - approximate a hard drop-off where the front face is submerged - by scaling the distance
	dz = scaleTopPlanarDistance(block, dz, vec3(0,0,1));

	//this means the front facing block that dips into the 
	//mortar is truncated and interpreted as a sideways distance
	//going away from the planar intersection - which is then
	//combined with the actual side distance at the diagonals..

	//scale the side in a similar way to get the distance to grout intersection
	vec3 snormal = mulVec( block.blockTransform, sideNormal);
	float szdiff = snormal.z;
	if( szdiff < 0 ) szdiff = -szdiff;
	if( szdiff >= 1.0f ) szdiff = 0.99999f;//no scale to infinity
	float scaleDistanceSide = 1.0f / (1.0f-szdiff);
	distFromEdge *= scaleDistanceSide;

	if( distFromEdge < 0 )
	{
		distFromEdge = dz;//over the block - use height directly
	}
	else if( dz >= 0 )
	{
		//diagonal case outside of front and sides..
		//can do slightly nicer bevels with more intersections (limited use case TBD)..
		distFromEdge = sqrt((dz*dz)+(distFromEdge*distFromEdge));
	}
	//else it is the scaled distance from side

	return distFromEdge;

}

vec3 getBlockTrim(vec4 randomVec)
{
	float trimX = (randomVec.x * uRandomScale * 0.5f) + uBorderU;
	float trimY = (randomVec.y * uRandomScale * 0.5f) + uBorderV;
	float trimZ = (randomVec.z * uRandomScale * 0.5f) + uBorderW;

	trimX = 0.5f - ((0.5f-trimX)*uUnitWidth);
	trimY = 0.5f - ((0.5f-trimY)*uUnitHeight);

	float maxTrim = 0.49f;//min block size 2%

	if( trimX > maxTrim ) trimX = maxTrim;
	if( trimY > maxTrim ) trimY = maxTrim;
	if( trimZ > maxTrim ) trimZ = maxTrim;

	return vec3(trimX, trimY, trimZ);
}

BlockInfo initBlockInfo3D(vec3 pos, vec3 normal)
{

	float x = pos.x;
	float y = pos.y;
	float z = pos.z;

	BlockInfo block;
	block.randomTileVec = getRandomTileValues(x, y);

	float rotx = (((block.randomTileVec.x - 0.5f)*2) * uBlockRollX * uRandomRotation) + uBlockRotX;
	float roty = (((block.randomTileVec.y - 0.5f)*2) * uBlockRollY * uRandomRotation) + uBlockRotY;
	float rotz = (((block.randomTileVec.z - 0.5f)*2) * uBlockRollZ * uRandomRotation) + uBlockRotZ;
	
	block.blockTransform = generateMatrix(rotx, roty, rotz);

	block.originalCoordinates = pos;

	float offset = 1;
	if( uChannel == 10 ) offset = uProjectionOffset;

	block.depthProjectionVector = -normal;

	float startpx = mod(x, 1);
	float startpy = mod(y, 1);
	float startpz = mod(z, 1);

	startpx = 0.5f - ((0.5f-startpx)*uUnitWidth);
	startpy = 0.5f - ((0.5f-startpy)*uUnitHeight);

	block.depthProjectionStartPos.x = startpx - 0.5f;
	block.depthProjectionStartPos.y = startpy - 0.5f;
	block.depthProjectionStartPos.z = startpz - 0.5f;

	block.depthProjectionStartPos -= block.depthProjectionVector; 

	block.depthProjectionStartPos = mulVec( block.blockTransform, block.depthProjectionStartPos);

	block.depthProjectionStartPos.x += 0.5f;
	block.depthProjectionStartPos.y += 0.5f;
	block.depthProjectionStartPos.z += 0.5f;

	block.depthProjectionVector = mulVec( block.blockTransform, block.depthProjectionVector);
	block.depthProjectionEndPos = block.depthProjectionStartPos + (block.depthProjectionVector*offset*2);

	vec3 trim = getBlockTrim(block.randomTileVec);
	vec3 hsize = vec3(0.5f-trim.x, 0.5f-trim.y, 0.5f-trim.z);

	block.lo.x = 0.5f-hsize.x;
	block.lo.y = 0.5f-hsize.y;
	block.lo.z = 0.5f-hsize.z;
	block.hi.x = 0.5f+hsize.x;
	block.hi.y = 0.5f+hsize.y;
	block.hi.z = 0.5f+hsize.z;

	float randomDepthOffset = mod((block.randomTileVec.x + block.randomTileVec.y + block.randomTileVec.z)*999999, 1);
	randomDepthOffset = (randomDepthOffset - 0.5f) * uRandomDepth;

	float zoffset = randomDepthOffset + uUnitDepthOffset;

	float blockWidth = block.hi.x - block.lo.x;
	float blockHeight = block.hi.y - block.lo.y;
	float blockDepth = block.hi.z - block.lo.z;

	float upperZ = zoffset + (blockDepth/2);

	float bevelSpace = uBevelDepth*uBevelWidth;
	vec3 cornerPoint1 = vec3(-blockWidth/2, -blockHeight/2, upperZ);
	vec3 cornerPoint2 = vec3(blockWidth/2, -blockHeight/2, upperZ);

	vec3 extent1 = mulVec( block.blockTransform, cornerPoint1);
	vec3 extent2 = mulVec( block.blockTransform, cornerPoint2);

	float extentZDiff1 = upperZ - extent1.z;
	if( extentZDiff1 < 0 ) extentZDiff1 = -extentZDiff1;
	float extentZDiff2 = upperZ - extent2.z;
	if( extentZDiff2 < 0 ) extentZDiff2 = -extentZDiff2;

	float extentZDiff = extentZDiff1;
	if( extentZDiff < extentZDiff2 ) extentZDiff = extentZDiff2;

	extentZDiff *= 2;
	
	float maxOffset = 0.499999f - extentZDiff;
	float minOffset = -0.499999f;

	if( zoffset > maxOffset ) zoffset = maxOffset;

	block.lo.z += zoffset;
	block.hi.z += zoffset;

	block.lo.z -= bevelSpace;
	block.hi.z -= bevelSpace;

	return block;
}

float getAxisPlaneIntersectionPercent(float axisPlane, float startValue, float endValue)
{
	float result = -1;

	if ( startValue > axisPlane && endValue < axisPlane )
	{
		float startDiff = startValue-axisPlane;
		float endDiff = axisPlane-endValue;
		result = startDiff / (startDiff+endDiff);
	}
	else if ( startValue < axisPlane && endValue > axisPlane )
	{
		float startDiff = axisPlane-startValue;
		float endDiff = endValue-axisPlane;
		result = startDiff / (startDiff+endDiff);
	}
	
	return result;
}

struct RayTraceHit
{
	int primaryPlaneHit;
	float percentToHit;
	float seamPercent;
	float distanceFromBlock;
	float accumDistanceFromAllBlocks;
	float hitPrimitiveType;
	float bevelPercent;
};

float testCylinderIntersection(float a, float b, float c)
{
	float delta = b*b - a*c;
	float epsilon = 0.000001f;
	if (delta < epsilon) return 0;
	float t = (-b - sqrt (delta))/a;
	if( t <= epsilon ) return 0;
	return t;
}

float hitCylinderX (vec3 origin, vec3 direction, vec3 center, float radius)
{
	vec3 p0 = vec3(origin.x-center.x, origin.y-center.y, origin.z-center.z);
	float a = (direction.y * direction.y) + (direction.z * direction.z);
	float b = (direction.y * p0.y) + (direction.z * p0.z);
	float c = (p0.y*p0.y)+(p0.z*p0.z)-(radius*radius);
	return testCylinderIntersection(a, b, c);
}

float hitCylinderY (vec3 origin, vec3 direction, vec3 center, float radius)
{
	vec3 p0 = vec3(origin.x-center.x, origin.y-center.y, origin.z-center.z);
	float a = (direction.x * direction.x) + (direction.z * direction.z);
	float b = (direction.x * p0.x) + (direction.z * p0.z);
	float c = (p0.x*p0.x)+(p0.z*p0.z)-(radius*radius);
	return testCylinderIntersection(a, b, c);
}

float hitCylinderZ (vec3 origin, vec3 direction, vec3 center, float radius)
{
	vec3 p0 = vec3(origin.x-center.x, origin.y-center.y, origin.z-center.z);
	float a = (direction.x * direction.x) + (direction.y * direction.y);
	float b = (direction.x * p0.x) + (direction.y * p0.y);
	float c = (p0.x*p0.x)+(p0.y*p0.y)-(radius*radius);
	return testCylinderIntersection(a, b, c);
}

float hitCylinder (vec3 origin, vec3 direction, vec3 center, float radius, int axis)
{
	if( axis == 0 ) return hitCylinderX (origin, direction, center, radius);
	if( axis == 1 ) return hitCylinderY (origin, direction, center, radius);
	if( axis == 2 ) return hitCylinderZ (origin, direction, center, radius);
	return 0;
}

vec4 getSphereCornerCoords(BlockInfo block, vec3 coords, float radius)
{
	bool lox = coords.x < 0.5f;
	bool loy = coords.y < 0.5f;
	bool loz = coords.z < 0.5f;

	float xcoord = 0.5f;
	float ycoord = 0.5f;
	float zcoord = 0.5f;

	if( lox ) xcoord = block.lo.x + radius;
	else xcoord = block.hi.x-radius;
	if( loy ) ycoord = block.lo.y + radius;
	else ycoord = block.hi.y-radius;
	if( loz ) zcoord = block.lo.z + radius;
	else zcoord = block.hi.z-radius;
	return vec4(xcoord, ycoord, zcoord, radius);
}

vec4 getCylinderEdgeCoords(BlockInfo block, vec3 coords, float radius, int axis)
{
	vec4 result = getSphereCornerCoords(block, coords, radius);
	if( axis == 0 ) result.x = 0.5f;
	if( axis == 1 ) result.y = 0.5f;
	if( axis == 2 ) result.z = 0.5f;
	return result;
}

struct PlanarHit
{
	vec2 hitUVs;
	float distanceToHit;
	int planeID;//implies normal
};

//0 if within outside square corner, or 0.0 to 1.41421356237 percent out (>1 exceeds round corner)
float percentFromRoundedCorner2D(float u, float v, float scaleU, float scaleV, float radiusPercent)
{
	if( u > 0.5f ) u = 1.0f - u;
	if( v > 0.5f ) v = 1.0f - v;
	u *= scaleU;
	v *= scaleV;
	if( u >= radiusPercent || v >= radiusPercent ) return 0;
	float dx = radiusPercent - u;
	float dy = radiusPercent - v;
	float dist = sqrt((dx*dx)+(dy*dy));
	float percentToEdge = dist / radiusPercent;
	return percentToEdge;
}

bool withinValues(float lo, float hi, float testValue)
{
	return testValue >= lo && testValue <= hi;
}

PlanarHit rayTraceBlockFaces(BlockInfo block)
{
	vec3 rayStart = block.depthProjectionStartPos;
	vec3 rayEnd = block.depthProjectionEndPos;

	bool hitlox = rayStart.x < 0.5f;
	bool hitloy = rayStart.y < 0.5f;
	bool hitloz = rayStart.z < 0.5f;

	float bpx = 0;
	float bpy = 0;
	float bpz = 0;

	if( hitlox ) bpx = getAxisPlaneIntersectionPercent(block.lo.x, rayStart.x, rayEnd.x);
	else bpx = getAxisPlaneIntersectionPercent(block.hi.x, rayStart.x, rayEnd.x);
	if( hitloy ) bpy = getAxisPlaneIntersectionPercent(block.lo.y, rayStart.y, rayEnd.y);
	else bpy = getAxisPlaneIntersectionPercent(block.hi.y, rayStart.y, rayEnd.y);
	if( hitloz ) bpz = getAxisPlaneIntersectionPercent(block.lo.z, rayStart.z, rayEnd.z);
	else bpz = getAxisPlaneIntersectionPercent(block.hi.z, rayStart.z, rayEnd.z);

	vec3 projx = (rayStart * (1.0f-bpx)) + (rayEnd * bpx);
	vec3 projy = (rayStart * (1.0f-bpy)) + (rayEnd * bpy);
	vec3 projz = (rayStart * (1.0f-bpz)) + (rayEnd * bpz);

	bool hitx = false;
	bool hity = false;
	bool hitz = false;

	//rule out plane intersections not within the others
	if( bpx != -1 )	hitx = withinValues(block.lo.y, block.hi.y, projx.y) && withinValues(block.lo.z, block.hi.z, projx.z);
	if( bpy != -1 )	hity = withinValues(block.lo.x, block.hi.x, projy.x) && withinValues(block.lo.z, block.hi.z, projy.z);
	if( bpz != -1 )	hitz = withinValues(block.lo.x, block.hi.x, projz.x) && withinValues(block.lo.y, block.hi.y, projz.y);

	if( hitx && hity && hitz )
	{
		if( bpx <= bpy && bpx <= bpz ) hity = hitz = false;
		else if( bpy <= bpx && bpy <= bpz ) hitx = hitz = false;
		else hitx = hity = false;
	}
	else if( hitx && hity )
	{
		if( bpx <= bpy ) hity = false;
		else hitx = false;
	}
	else if( hitx && hitz )
	{
		if( bpx <= bpz ) hitz = false;
		else hitx = false;
	}
	else if( hity && hitz )
	{
		if( bpy <= bpz ) hitz = false;
		else hity = false;
	}

	PlanarHit result;

	result.hitUVs = vec2(0,0);
	result.distanceToHit = 0;
	result.planeID = -1;

	if( hitx )
	{
		result.hitUVs = planeUVs(block, projx, 0);
		result.distanceToHit = bpx*uProjectionOffset*2;
		result.planeID = 0;
		if( !hitlox ) result.planeID += 3;
	}
	else if( hity )
	{
		result.hitUVs = planeUVs(block, projy, 1);
		result.distanceToHit = bpy*uProjectionOffset*2;
		result.planeID = 1;
		if( !hitloy ) result.planeID += 3;
	}
	else if( hitz )
	{
		result.hitUVs = planeUVs(block, projz, 2);
		result.distanceToHit = bpz*uProjectionOffset*2;
		result.planeID = 2;
		if( !hitloz ) result.planeID += 3;
	}

	return result;
}

//x = top bevel percent
//y = bottom bevel percent
//z = hit bevel percent
//w = percent to hit
vec4 rayTraceBevelPercent(BlockInfo block)
{
	vec4 result = vec4(-1,-1,-1,-1);

	if( uBevelDepth*uBevelWidth <= 0 ) return result;

	//get fast planar intersections
	vec3 rayStart = block.depthProjectionStartPos;
	vec3 rayEnd = block.depthProjectionEndPos;

	float projectTop = getAxisPlaneIntersectionPercent(block.hi.z+(uBevelDepth*uBevelWidth), rayStart.z, rayEnd.z);
	vec3 hitPositionTop = (rayStart * (1.0f-projectTop)) + (rayEnd * projectTop);
	float topBevelPercent = getFrontBevelPercent(block, hitPositionTop);

	float projectBottom = getAxisPlaneIntersectionPercent(block.hi.z, rayStart.z, rayEnd.z);
	vec3 hitPositionBottom = (rayStart * (1.0f-projectBottom)) + (rayEnd * projectBottom);
	float bottomBevelPercent = getFrontBevelPercent(block, hitPositionBottom);

	if( topBevelPercent >= 1.0f ) return vec4(1,1,1,projectTop);

	if( bottomBevelPercent <= 0 ) return vec4(-1,-1,-1,-1);

	float topProfileDiff = 1.0f-topBevelPercent;
	float bottomProfileDiff = bottomBevelPercent;

	if( topProfileDiff < 0 ) topProfileDiff *= -1;
	if( bottomProfileDiff < 0 ) bottomProfileDiff *= -1;

	float total = topProfileDiff+bottomProfileDiff;
	float topPercent = bottomProfileDiff/total;
	float bottomPercent = topProfileDiff/total;

	float bevelPercent = (topBevelPercent*topPercent)+(bottomBevelPercent*bottomPercent);

	topPercent = bevelPercent;
	bottomPercent = 1.0f-topPercent;

	float percentToHit = (projectTop*topPercent)+(projectBottom*bottomPercent);

	float maxProjectionPercent = 0.5f - (uBorderDepth/2);

	if( percentToHit >= maxProjectionPercent ) return vec4(-1,-1,-1,-1);

	if( uBevelRoundness != 0 )
	{
		const float d2r = 3.14159265359f / 180;
		float curvedValue = sin(bevelPercent*90*d2r);
		bevelPercent = (bevelPercent*(1.0f-uBevelRoundness))+(curvedValue*uBevelRoundness);
	}

	if( bevelPercent <= 0 )	bevelPercent = 0;
	if( bevelPercent >= 1 )	bevelPercent = 1;

	topPercent = bevelPercent;
	bottomPercent = 1.0f-topPercent;
	
	percentToHit = (projectTop*topPercent)+(projectBottom*bottomPercent);

	result.x = topBevelPercent;//x = top bevel percent
	result.y = bottomBevelPercent;//y = bottom bevel percent
	result.z = bevelPercent;//z = hit bevel percent
	result.w = percentToHit;//w = percent to hit

	return result;
}

vec4 rayTraceRoundedSides(BlockInfo block)
{
	vec3 rayStart = block.depthProjectionStartPos;
	vec3 rayEnd = block.depthProjectionEndPos;

	PlanarHit planes = rayTraceBlockFaces(block);

	float percentToHit = -1;

	vec4 result = vec4(0,0,0,0);

	vec3 hitPosition = vec3(0, 0, 0);
	float blockWidth = block.hi.x - block.lo.x;
	float blockHeight = block.hi.y - block.lo.y;

	if( planes.planeID != -1 )
	{
		result.y = planes.planeID;
		if( result.y == 5 ) result.y = 2;

		percentToHit = planes.distanceToHit / (uProjectionOffset*2);

		hitPosition = (rayStart * (1.0f-percentToHit)) + (rayEnd * percentToHit);

		bool testCorner = false;

		vec2 hitUVs = planeUVs(block, hitPosition, 2);
		float cornerPercent = percentFromRoundedCorner2D(hitUVs.x, hitUVs.y, blockWidth, blockHeight, uCornerRoundness);
		testCorner = cornerPercent >= 1;
		if( testCorner )
		{
			vec4 cornerCylinderCoords = getCylinderEdgeCoords(block, hitPosition, uCornerRoundness, 2);
			float hit = hitCylinder (block.depthProjectionStartPos, block.depthProjectionVector, cornerCylinderCoords.xyz, cornerCylinderCoords.w, 2);
			float lastPercent = percentToHit;
			percentToHit = 0;
			if( hit != 0 )
			{
				float newPercentToHit = hit / (uProjectionOffset * 2);
				if( newPercentToHit > lastPercent )
				{
					percentToHit = newPercentToHit;
					result.x = 1;
				}
			}
			else
			{
				result.y = 0;
				percentToHit = 0;
			}
		}
	}
	result.w = percentToHit;

	return result;
}

RayTraceHit rayTraceBlockFront(BlockInfo block)
{

	vec3 rayStart = block.depthProjectionStartPos;
	vec3 rayEnd = block.depthProjectionEndPos;

	RayTraceHit result;

	result.primaryPlaneHit = -1;
	result.hitPrimitiveType = -1;
	result.percentToHit = 0;
	result.accumDistanceFromAllBlocks = 0;
	result.bevelPercent = 0;
	result.distanceFromBlock = 0;
	result.seamPercent = 0;

	vec3 hitPosition = vec3(0, 0, 0);
	float blockWidth = block.hi.x - block.lo.x;
	float blockHeight = block.hi.y - block.lo.y;

	float maxProjectionPercent = 0.5f - (uBorderDepth/2);

	int hitAxisPlane = -1;

	vec4 sidesInfo = rayTraceRoundedSides(block);

	if( sidesInfo.w > 0 )
	{
		result.percentToHit = sidesInfo.w;
		result.primaryPlaneHit = 0;
		hitAxisPlane = sidesInfo.y;
		if( sidesInfo.x > 0 )
		{
			result.hitPrimitiveType = 3;
		}
	}

	if( uBevelWidth != 0 && uBevelDepth != 0 && hitAxisPlane == 2 && result.hitPrimitiveType != 3 )
	{
		vec4 bevelInfo = rayTraceBevelPercent(block);
		if( bevelInfo.w >= 0 && bevelInfo.w < maxProjectionPercent )
		{
			result.bevelPercent = bevelInfo.z;
			result.percentToHit = bevelInfo.w;
			result.primaryPlaneHit = 5;
			result.hitPrimitiveType = 2;
		}
	}

	if( result.percentToHit >= maxProjectionPercent || result.percentToHit == 0 )
	{
		result.percentToHit = maxProjectionPercent;
		result.primaryPlaneHit = -1;
	}

	if( result.primaryPlaneHit == -1 )
	{
		hitPosition = (rayStart * (1.0f-result.percentToHit)) + (rayEnd * result.percentToHit);
		result.distanceFromBlock = getDistanceFromSubmergedBlockSilhouette(block, hitPosition);
	}
	return result;
}

RayTraceHit rayTraceNeighborBlock(BlockInfo block, vec3 normal, float offsetX, float offsetY, float offsetZ)
{
	vec3 npos = block.originalCoordinates;

	npos.x += (uOffset * offsetY);

	npos.x += offsetX;
	npos.y += offsetY;
	npos.z += offsetZ;

	BlockInfo neighbor = initBlockInfo3D(npos, normal);
	offsetX *= uUnitWidth;
	offsetY *= uUnitHeight;
	vec3 projectionOffset = mulVec( neighbor.blockTransform, vec3(offsetX, offsetY, offsetZ) );
	neighbor.depthProjectionStartPos -= projectionOffset;
	neighbor.depthProjectionEndPos -= projectionOffset;
	RayTraceHit neighborHit = rayTraceBlockFront(neighbor);
	return neighborHit;
}

float fleast(float a, float b, float c)
{
	if( a < b && a < c ) return a;
	if( b < a && b < c ) return b;
	return c;
}

vec2 least(float a, float b, float c, float d)
{
	vec2 result = vec2(0, 0);
	if( a < b && a < c && a < d )
	{
		result.x = a;
		result.y = fleast(b, c, d);
	}
	else if( b < a && b < c && b < d )
	{
		result.x = b;
		result.y = fleast(a, c, d);
	}
	else if( c < a && c < b && c < d )
	{
		result.x = c;
		result.y = fleast(a, b, d);
	}
	else
	{
		result.x = d;
		result.y = fleast(a, b, c);
	}
	return result;
}

float getShadowArcAtDistance(float d)
{
	float p = d / uBorderShadowLength;
	if( p > 1 ) p = 1;
	return 90.0f * p;
}

float getShadowAtDegree(float angle)
{
	const float d2r = 3.14159265359f / 180;
	float value = sin(angle*d2r);
	value *= value;
	return value;
}

RayTraceHit rayTraceLocalBlock(BlockInfo block, vec3 normal)
{

	RayTraceHit primaryHit = rayTraceBlockFront(block);

	if( primaryHit.percentToHit == -1 ) return primaryHit;//immediate return if clips inside any block

	float px = mod(block.originalCoordinates.x, 1);
	float py = mod(block.originalCoordinates.y, 1);
	float pz = mod(block.originalCoordinates.z, 1);
	float offsetX = -1;
	float offsetY = -1;
	float offsetZ = -1;
	if( px > 0.5f ) offsetX = 1;
	if( py > 0.5f ) offsetY = 1;
	if( pz > 0.5f ) offsetZ = 1;

	RayTraceHit hitX = rayTraceNeighborBlock(block, normal, offsetX, 0, 0);
	if( hitX.percentToHit == -1 ) return hitX;

	RayTraceHit hitY = rayTraceNeighborBlock(block, normal, 0, offsetY, 0);
	if( hitY.percentToHit == -1 ) return hitY;

	RayTraceHit hitXY = rayTraceNeighborBlock(block, normal, offsetX, offsetY, 0);
	if( hitXY.percentToHit == -1 ) return hitXY;

	//assume we have an offset always - need to check 2 cells above and below
	bool checkCorner = offsetX == offsetY;

	RayTraceHit hitnXY;

	if( checkCorner )
	{
		hitnXY = rayTraceNeighborBlock(block, normal, -offsetY, offsetY, 0);
		if( hitnXY.percentToHit == -1 ) return hitnXY;
	}
	else
	{
		hitnXY.primaryPlaneHit = -1;
		hitnXY.hitPrimitiveType = -1;
		hitnXY.percentToHit = 2;
		hitnXY.accumDistanceFromAllBlocks = 0;
		hitnXY.bevelPercent = 0;
		hitnXY.distanceFromBlock = 0;
		hitnXY.seamPercent = 0;
	}

	primaryHit.accumDistanceFromAllBlocks = 0;
	primaryHit.accumDistanceFromAllBlocks += primaryHit.distanceFromBlock;
	primaryHit.accumDistanceFromAllBlocks += hitX.distanceFromBlock;
	primaryHit.accumDistanceFromAllBlocks += hitY.distanceFromBlock;
	primaryHit.accumDistanceFromAllBlocks += hitXY.distanceFromBlock;

	bool hitSeam = primaryHit.primaryPlaneHit == -1 && hitX.primaryPlaneHit == -1 && hitY.primaryPlaneHit == -1 && hitXY.primaryPlaneHit == -1 && hitnXY.primaryPlaneHit == -1;

	if( hitSeam )
	{
		if ( uBorderShadowLength != 0 )
		{
			float distX = hitX.distanceFromBlock;
			float distY = hitY.distanceFromBlock;
			float distXY = hitXY.distanceFromBlock;
			float distnXY = hitnXY.distanceFromBlock;

			vec2 vleast = least(primaryHit.distanceFromBlock, distX, distY, distXY);

			if( checkCorner )
			{
				if( distnXY <= vleast.x )
				{
					vleast.y = vleast.x;
					vleast.x = distnXY;
				}
				else if( distnXY < vleast.y )
				{ vleast.y = distnXY; }
			}

			//nearest surfaces
			float nearestBlockA = vleast.x;
			float nearestBlockB = vleast.y;

			float totalAcross = nearestBlockA + nearestBlockB;

			//shadow degrees halfway across >90 means smoothness between
			float shadowArcAtMidPoint = getShadowArcAtDistance(totalAcross / 2);
			float shadowArcAtSample = getShadowArcAtDistance(nearestBlockA);

			float percentToMidPoint = shadowArcAtSample/shadowArcAtMidPoint;

			float percentShadowAtMidPoint = shadowArcAtMidPoint / 90;
			float percentShadowAtSample = shadowArcAtSample / percentShadowAtMidPoint;

			float pdist = primaryHit.distanceFromBlock;

			primaryHit.distanceFromBlock = nearestBlockA;

			//avoid full overlapping neighbor checks - apply shadow within seam using nearest edges
			//shadow arcs may intersect anywhere - lerp to averaged/smoothed center value

			float arcBump = 90.0f-shadowArcAtMidPoint;

			float seamPercentA = getShadowAtDegree(shadowArcAtSample);
			float seamPercentB = getShadowAtDegree(shadowArcAtSample+arcBump) - getShadowAtDegree(arcBump);
			float lerp = percentToMidPoint;

			primaryHit.seamPercent = (seamPercentA*(1.0f-lerp))+(seamPercentB*lerp);
		}
		else
		{ primaryHit.seamPercent = 1; }
	}
	else
	{
		if( hitX.percentToHit <= hitY.percentToHit && hitX.percentToHit <= hitXY.percentToHit && hitX.percentToHit <= hitnXY.percentToHit  )
		{
			if( hitX.percentToHit < primaryHit.percentToHit )
			{
				primaryHit.percentToHit = hitX.percentToHit;
				primaryHit.primaryPlaneHit = hitX.primaryPlaneHit;
			}
		}
		else if( hitY.percentToHit <= hitX.percentToHit && hitY.percentToHit <= hitXY.percentToHit && hitY.percentToHit <= hitnXY.percentToHit )
		{
			if( hitY.percentToHit < primaryHit.percentToHit )
			{	
				primaryHit.percentToHit = hitY.percentToHit;
				primaryHit.primaryPlaneHit = hitY.primaryPlaneHit;
			}
		}
		else if( hitXY.percentToHit <= hitX.percentToHit && hitXY.percentToHit <= hitY.percentToHit && hitXY.percentToHit <= hitnXY.percentToHit )
		{
			if( hitXY.percentToHit < primaryHit.percentToHit )
			{	
				primaryHit.percentToHit = hitXY.percentToHit;
				primaryHit.primaryPlaneHit = hitXY.primaryPlaneHit;
			}
		}
		else
		{
			if( hitnXY.percentToHit < primaryHit.percentToHit )
			{
				primaryHit.percentToHit = hitnXY.percentToHit;
				primaryHit.primaryPlaneHit = hitnXY.primaryPlaneHit;
			}
		}
	}

	return primaryHit;
}

vec4 getRawTilingData(vec3 pos, vec3 normal)
{
	BlockInfo block = initBlockInfo3D(pos, normal);

	RayTraceHit intersection = rayTraceLocalBlock(block, normal);

	vec4 output = vec4(0.0,0.0,0.0,0.0);

	if( intersection.primaryPlaneHit == -1 )
	{
		output.x = 0.0;
		output.y = intersection.accumDistanceFromAllBlocks;
		output.z = intersection.seamPercent;
	}
	else
	{
		if( intersection.percentToHit == -1 )
		{
			//ray started inside geometry
			return output;
		}
		output.x = 1.0;
		output.y = 0.0;
		output.z = intersection.bevelPercent;
	}

	float maxProjectionPercent = 0.5f;//1/2 is block center - limit grayscale

	output.w = 1.0-(intersection.percentToHit/maxProjectionPercent);

	return output;
}

float getGrayscaleDisplacement(vec4 rawData)
{
	return rawData.w;
}

vec4 convertToOutput(vec4 rawData)
{
	vec4 outputColor = vec4(0.0, 0.0, 0.0, 1.0);

	if( rawData.x == 0.0 && rawData.y == 0.0 ) 
	{ return vec4(1.0, 1.0, 1.0, 1.0); }

	if( uChannel != CHANNEL_DISPLACEMENT && uChannel != CHANNEL_BUMP )
	{
		//apply coloring
		if( rawData.x == 0.0 )
		{
			//grout - blend with shadow color
			float seam = rawData.z;
			float shadowValue = 1.0 - ((1.0-seam)*(1.0-uBorderShadowDepth)); //from 1.0 towards 0.0 scaled by user depth control
			float lerp = 1.0 - seam;
			outputColor.xyz = (uGroutColor.xyz*(1.0f-lerp))+(uShadowColor.xyz*lerp);
		}
		else
		{
			//tile - set tile or bevel color
			float bevel = rawData.z;
			vec4 hardBevel = uTileColor;
			if( bevel < 1.0 )
			{ hardBevel = uBevelColor; }
			vec4 smoothBevel = (uBevelColor*(1.0-bevel))+(uTileColor*bevel);
			outputColor.xyz = (hardBevel.xyz*(1.0-uBevelRoundness))+(smoothBevel.xyz*uBevelRoundness);
		}
	}
	else
	{
		//generate grayscale displacement
		float value = getGrayscaleDisplacement(rawData);
		if( rawData.x == 0.0 )
		{
			float seam = rawData.z;
			float shadowValue = 1.0 - ((1.0-seam)*(1.0-uBorderShadowDepth));//from 1.0 towards 0.0 scaled by user depth control
			float lerp = 1.0 - seam;
			shadowValue = uBorderShadowDepth;
			value = (value*(1.0-lerp))+(shadowValue*lerp);
		}
		outputColor.x = value;
		outputColor.y = value;
		outputColor.z = value;
	}
	outputColor.w = 1.0;

	return outputColor;
}

vec3 getTilingCoords(float x, float y)
{
	x = x * uScale;
	y = y * uScale;
	
	x /= uUnitWidth;
	y /= uUnitHeight;

	int iy = (int)y;

	x += uOffset * iy;	

	x += uScale / uUnitWidth;
	y += uScale / uUnitHeight;

	return vec3(x,y,0.5);
}


vec4 runEffect(LayerState state)
{
	vec4 outputColor = vec4(0.0,0.0,0.0,0.0);
	vec3 normal = vec3(0.0 ,0.0, 1.0);	
	vec4 rawData = getRawTilingData( getTilingCoords(state.texCoord.x, state.texCoord.y), normal );
	return convertToOutput(rawData);
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ 
	vec4 outputColor = state.result;
	
	if( uInvertEffect != 0 )
	{
		outputColor.x = 1.0-outputColor.x;
		outputColor.y = 1.0-outputColor.y;
		outputColor.z = 1.0-outputColor.z;
	}

	outputColor = lerp( vec4(0.5,0.5,0.5,1.0), outputColor, uContrast );	//lerp between flat gray and tiles
	outputColor = applyGradientMapRGB(outputColor);
	return outputColor;
}


