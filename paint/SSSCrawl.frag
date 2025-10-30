#include "commonPaint.sh"

uniform float uSkipCompensation;

USE_TEXTURE2D(tTex);
USE_TEXTURE2D(tPosTex);
uniform ivec2 uTexSize;
uniform float uTypeB;		//lerp between the two types of mapping
BEGIN_PARAMS
    INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 centerNorm = texture2D(tTex, vec2(0.5, 0.5));
	vec4 centerPos = texture2D(tPosTex, vec2(0.5, 0.5)) * 2.0 - 1.0;
	vec4 here = texture2D(tTex, fCoord);
	vec4 pos = texture2D(tPosTex, fCoord);
	vec2 dir = fCoord - vec2(0.5, 0.5) - vec2(0.5 / float(uTexSize.x), 0.5 / float(uTexSize.y));
	float pixelDist = length(dir * vec2(uTexSize));
	vec4 lastNorm = centerNorm;
	vec4 lastPos = centerPos;
	float cyoomDistance = 0.0;		//cumulative distance
	vec2 totalDist = vec2(0.0, 0.0);
	float zMult = 1.0;
	float uDist = 0.0;
	float vDist = 0.0;
	vec2 lastTC = vec2(0.5, 0.5);
	//for some reason, pixelDist/N works best as a sampling interval, rather than an arbitrary number
	//this produces much less noise
	dir = normalize(dir);
	
	//find the length of the direction if it were clipped into a 2x2 square
	float pixelDelta = 1.0 / max(abs(dir.x), abs(dir.y));
	pixelDelta = pixelDist / max(floor(pixelDist/pixelDelta), 1.0);
	if(uSkipCompensation)
	{
		pixelDist = 0.0;
	}  
	for(float i = 1; i <= pixelDist; i += pixelDist / 50.0)	
	{
		vec2 tc = mix(vec2(0.5, 0.5), fCoord, i / pixelDist); 
		vec4 normHere = texture2DLod(tTex, tc, 0.0);
		vec4 posHere = texture2DLod(tPosTex, tc, 0.0) * 2.0 - 1.0;
		
		//z only affects the crawl when the surface normal is not perp to the U or V direction
		vec3 normal = normHere.xyz * 2.0 - 1.0;
		if(length(normal))
		{ normal = normalize(normal); }
		vec3 delta = lastPos.xyz - posHere.xyz;
		vec2 SSDelta;
		SSDelta.xy = (delta.xy) * 0.5;

		lastTC = tc;


		//does the deltaZ affect the x or y axis of the sticker-splot?
		vec2 SSNormal = (normal.xy);
		if(length(SSNormal) > 0.01)
		{
			SSNormal = normalize(SSNormal);
		}

		float zXness = abs(SSNormal.x);
		float zYness = abs(SSNormal.y);
		//there's two different ways to do the sticker-smoothing, regarding the z-axis
		//type A uses the change in z-depth combined with the surface normal to hug geometry:  
		//and type B uses just the surface normal:
		//A:  deltaU.y = delta.z * normalize(normal.xy).x * 0.5;
		//B:  deltaU.y = delta.x * normal.x;
		
		//Type A is better for normals with low Z, get gets distorted near (0, 0.5), (0.5, 1), etc
		float typeB = uTypeB;
		vec2 deltaU = vec2(SSDelta.x, delta.z * zXness * 0.5);
		vec2 deltaV = vec2(SSDelta.y, delta.z * zYness * 0.5);
		
		deltaU.y = mix(abs(deltaU.y), abs(SSDelta.x * normal.x), typeB);
		deltaV.y = mix(abs(deltaV.y), abs(SSDelta.y * normal.y), typeB);
		uDist += length(deltaU);
		vDist += length(deltaV); 

		cyoomDistance += length(delta);
		totalDist += abs(delta.xy);
		lastNorm = normHere;
		lastPos = posHere;
	}
	totalDist = sqrt(uDist*uDist + vDist*vDist);
	vec2 TCDir = vec2(uDist * sign(dir.x), vDist * sign(dir.y));
	
	vec2 paintCoord = TCDir;

	OUT_COLOR0.rgb = vec3(0.0, 0.0, 0.0);
	
	if(abs(paintCoord.x) < 0.5 && abs(paintCoord.y) < 0.5)
		OUT_COLOR0.b = (pos.z);
//	if(abs(paintCoord.x) < 0.5 && abs(paintCoord.y) < 0.5)
	{
		//multiplier is so we can clearly indicate out-of-bounds in the indirection map
		paintCoord.xy /= INDIRECTION_MULTIPLIER;
		OUT_COLOR0.rg = paintCoord.xy + 0.5;
	}
	if(uSkipCompensation)
	{
		OUT_COLOR0.rg = fCoord;
		OUT_COLOR0.b = pos.z;
	}
	OUT_COLOR0.a = 1.0;
//	OUT_COLOR0.rgb = texture2D(tPosTex, vec2(fCoord.x, 1.0-fCoord.y)).rgb;
//	OUT_COLOR0.rgb = vec3(pos.z * 2.0 - 1.0);
}
