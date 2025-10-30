void splitFlags(inout float val, inout int flags)
{
	int i = (int)(val * 65535.0);
	flags = i & 15;
	val = ((float)(i&65520)) / 65520.0;
}

void insertFlags(inout float val, int flags)
{
	int i = ((int)(val * 65520.0)) & 65520;
	val = ((float)(i + clamp(flags, 0, 15))) / 65535.0;
}

USE_LOADSTORE_TEXTURE2D(float, tExisting, 1);
USE_TEXTURE2D(tSpline);
uniform int uMode;
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float existing = imageLoadRW(tExisting, (uint2)(IN_POSITION.xy)).r;
	int existingMask;
	splitFlags(existing, existingMask);
	float spline = imageLoad(tSpline, (uint2)(IN_POSITION.xy)).r;
	int newMask;
	splitFlags(spline, newMask);
	
	
	float normal = max(existing, spline);
	float neg = min(existing, 1.0-spline);
	float intersect = min(existing, spline) * ceil(existing) * ceil(spline);
	float result =  normal * (float)(uMode == 0) + neg * (float)(uMode == 1) + intersect * (float)(uMode == 2);
	int normalMask = max(newMask, existingMask);
	int negativeMask = (spline < 1.0) ? min(existingMask, newMask) : 0;
	if(spline == 1.0)
	{ negativeMask = 0; }
	else if(spline == 0)
	{ negativeMask = existingMask; }
	
	int intersectMask = min(newMask, existingMask);
	newMask = normalMask * (int)(uMode == 0) + negativeMask * (int)(uMode == 1) + intersectMask * (int)(uMode == 2);
	
	float existingAA = float(existingMask+1)/16.0;
	float newAA = float(newMask+1)/16.0;
	vec2 both = vec2(newMask, newAA);

	insertFlags(result, newMask);
	imageStore(tExisting, (uint2)(IN_POSITION.xy), vec4(result, result, result, result));
	OUT_COLOR0 = result;
}

