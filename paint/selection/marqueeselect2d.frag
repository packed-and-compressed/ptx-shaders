#include "../../common/util.sh"


uniform vec4 	uSelectionArea;	//x0, y0, x1, y1, in viewport space
uniform float	uCircular;
uniform ivec2	uVPSize;
uniform int		uAA;
uniform int		uFeather;	

float getDistance(vec2 localCoords)
{
	//we need to create a distance field for feathering
	vec2 selectionRegionPixels = (uSelectionArea.zw-uSelectionArea.xy) * vec2(uVPSize);
	vec2 pixelDelta = localCoords * 0.5 * selectionRegionPixels;

	float feather = 64.0;
	float localRadius = length(localCoords);
	
	//find the radius of the ellipse in the direction of our pixel
	float c = localCoords.x / localRadius;
	float s = localCoords.y / localRadius;
	float fullDist = length(pixelDelta);
	float rectPixelMult = selectionRegionPixels.x * 0.5;
	
	float xDist = max(abs(localCoords.x)-1.0, 0.0) * rectPixelMult;
	float yDist = max(abs(localCoords.y)-1.0, 0.0) * rectPixelMult;
	float invXDist = min(1.0-abs(localCoords.x), 1.0) * rectPixelMult;
	float invYDist = min(1.0-abs(localCoords.y), 1.0) * rectPixelMult;
	float invDist = min(invXDist, invYDist);
	
	//outside distance is never < 0 and (-inside distance) is never > 0
	float pixelDist = sqrt(xDist*xDist+yDist*yDist) - invDist;
	float ellipseRadiusHere = length(vec2(c, s) * selectionRegionPixels) * 0.5;
	float ellipseDist = max(0.0, fullDist-ellipseRadiusHere);
	
	return mix(pixelDist, ellipseDist, uCircular);
	

}

float selectAmountCircle(vec2 pos)
{
	vec2 localCoords = vec2(-1.0, -1.0) + ((pos.xy-uSelectionArea.xy) / (uSelectionArea.zw-uSelectionArea.xy)) * 2.0;
	return step(length(localCoords), 1.0);
}

float selectAmount(vec2 pos)
{
	return step(uSelectionArea.x, pos.x) * step(uSelectionArea.y, pos.y) * step(pos.x, uSelectionArea.z) * step(pos.y, uSelectionArea.w);
}

//evalulate the one-dimensional integral of our weighting function
float evalIntegral(float x, float y)
{
	return log(sqrt(x*x + y*y + 1) + x);
}

float getFeatheredCircle(vec2 pos)
{
	if(uFeather < 1.0)
	{ return selectAmountCircle(pos); }
		
	/*
		separated blur:
		weight function:  1/(sqrt(x*x + y*y + 1)
		integral WRT x is log(sqrt(x*x +y*y + 1) + x
		
		evaluating at each y-value and summing, dividing
	*/

		vec2 vpSize = vec2(uVPSize);
		float totalWeight = 0.0;
		float totalSelected = 0.0;
		float dx = 1.0 / vpSize.x;
		float dy = 1.0 / vpSize.y;
		float feather = float(uFeather);
		float delta = 1.0 / feather;
		
		for(float y = -1.0; y <= 1.0; y += delta)
		{
			float py = y * feather;
			float ly = y * feather * dy + pos.y;
			float lineWeight = evalIntegral(1.0, y)-evalIntegral(-1.0, y);	//weight of the whole line if it was fully selected
			float weightMult = 1.0;
			
			if(ly >= uSelectionArea.y && ly <= uSelectionArea.w)		//are we in the selection area? 
			{
				//let's try a continuous integral across the chord of the circle
				
				//get our relative y within the selection oval.  it's our sine
				float s = (ly - uSelectionArea.y) / (max(uSelectionArea.w-uSelectionArea.y, 0.001)) * 2.0 - 1.0;
				float c = sqrt(max(1.0-s*s, 0.0001));	//get the cosine
				
				float mid = uSelectionArea.x * 0.5 + uSelectionArea.z * 0.5;
				float r = (uSelectionArea.z-uSelectionArea.x) * 0.5;
				float su0 = clamp(mid-r * c - pos.x, -feather * dx, feather * dx); 
				float su1 = clamp(mid+r * c - pos.x, -feather * dx, feather * dx);
				
				float sv0 = su0 * vpSize.x * delta;
				float sv1 = su1 * vpSize.x * delta;
				float valueHere = evalIntegral(sv1, y) - evalIntegral(sv0, y);
				totalSelected += valueHere * weightMult;
			}
			totalWeight += lineWeight;
		
		}
		return totalSelected / totalWeight;
}

float getFeatheredRect(vec2 pos)
{
	if(uFeather < 1.0 || uCircular != 0.0)
	{ return selectAmount(pos); }
	
/*
	separated blur:
	weight function:  1/(sqrt(x*x + y*y + 1)
	integral WRT x is log(sqrt(x*x +y*y + 1) + x
	
	evaluating at each y-value and summing, dividing
*/

	vec2 vpSize = vec2(uVPSize);
	float totalWeight = 0.0;
	float totalSelected = 0.0;
	float dx = 1.0 / vpSize.x;
	float dy = 1.0 / vpSize.y;
	float feather = float(uFeather);
	float delta = 1.0 / feather;

	//let's try a continuous integral across the the whole area
	float su0 = clamp(uSelectionArea.x - pos.x, - feather * dx, feather * dx); 
	float su1 = clamp(uSelectionArea.z - pos.x, -feather*dx, feather * dx);
	float sv0 = su0 * vpSize.x * delta;
	float sv1 = su1 * vpSize.x * delta;
	
	for(float y = -1.0; y <= 1.0; y += delta)
	{
		float py = y * feather;
		float ly = y * feather * dy + pos.y;
		float lineWeight = evalIntegral(1.0, y)-evalIntegral(-1.0, y);	//weight of the whole line if it was fully selected
		float weightMult = 1.0;
		
#if 1
		if(ly >= uSelectionArea.y && ly <= uSelectionArea.w)		//are we in the selection area? 
		{
			float valueHere = evalIntegral(sv1, y) - evalIntegral(sv0, y); 
			totalSelected += valueHere * weightMult;
		}
		totalWeight += lineWeight;
#else
		
		for(float x = -1.0; x <= 1.0; x += delta)
		{
			float px = x * feather;
			float lx = x * feather * dx + pos.x;
			
			float weight = saturate(rsqrt(float(x*x+y*y+1.0)));
	//		weight = 1.0;
			totalSelected += selectAmount(vec2(lx, ly)) * weight;
			totalWeight += weight * 1.0;
		}
#endif
	
	}
	return totalSelected / totalWeight;
}

BEGIN_PARAMS
	INPUT0(vec2, fVPPos)

	OUTPUT_COLOR0(float)
END_PARAMS
{
	vec2 vpCoords = fVPPos;
	vec2 localCoords = vec2(-1.0, -1.0) + ((vpCoords.xy-uSelectionArea.xy) / (uSelectionArea.zw-uSelectionArea.xy)) * 2.0;	
	float selected = mix(selectAmount(vpCoords.xy), selectAmountCircle(vpCoords.xy), uCircular);
	float feathered = 1.0;
	if(uCircular == 1.0)
	{ feathered = getFeatheredCircle(vpCoords.xy); }
	else
	{feathered = getFeatheredRect(vpCoords.xy); }
	selected = mix(selected, feathered, step(0.5, float(uFeather)));
	
	//a very small value here simply indicates that there's geometry at this pixel
	OUT_COLOR0 = max(selected, 1.0/255.0);

	

}
