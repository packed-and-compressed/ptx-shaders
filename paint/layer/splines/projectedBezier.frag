#include "../../beziersdf.sh"

#ifndef OVERLAY
USE_TEXTURE2D(tDistData);
#endif

#ifndef NUM_CURVES
	#define NUM_CURVES 1
#endif

uniform vec4	uPoints[4 * NUM_CURVES];

void calcCurve(vec3 wsPos, inout vec2 uv, inout float alpha, inout vec3 nearestPoint, inout vec3 splineDirection)
{
	float T = 0.0;
	float curveRadius = 0.025;
	float travelDist = T;	//axial distance along the curve
	float dist = 10000.0;
	float side = 1.0;
	alpha = 0.0;
	for(int i = 0; i < NUM_CURVES; i++)
	{
		vec3 p0 = uPoints[0 + 4 * i].xyz;
		vec3 p1 = uPoints[1 + 4 * i].xyz;
		vec3 p2 = uPoints[2 + 4 * i].xyz;
		vec3 p3 = uPoints[3 + 4 * i].xyz;

		vec3 maxP = max(p0, max(p1, max(p2, p3))) + curveRadius + 0.02;
		vec3 minP = min(p0, min(p1, min(p2, p3))) - curveRadius - 0.02;

		if(wsPos.x < maxP.x && wsPos.x > minP.x && wsPos.y < maxP.y && wsPos.y > minP.y && wsPos.z > minP.z && wsPos.z < maxP.z)
		{
			
			float thisDist = cubic_bezier_dis(wsPos, p0, p1, p2, p3, T);
			if(thisDist < dist)
			{
				dist = thisDist;
				side = sideDot(wsPos, p0, p1, p2, p3, vec3(0.0, 0.0, 1.0), T);
				travelDist = T;
				//get convert T to a curve distance with our texture data
			#ifndef OVERLAY
				float vCoord = ((float)i + 0.5) / (float)NUM_CURVES; 
				travelDist = texture2D(tDistData, vec2(T, vCoord)).x;
			#endif
				nearestPoint = parametric_cub_bezier(T, p0, p1, p2, p3);
				vec3 s1 = parametric_cub_bezier(T - 0.01, p0, p1, p2, p3);
				vec3 s2 = parametric_cub_bezier(T + 0.01, p0, p1, p2, p3);
				splineDirection = normalize(s2-s1);
			}
		}
	}
	uv.x = 0.5 + 0.5 * sign(side) * dist / curveRadius;
	uv.y = travelDist / curveRadius * 0.5;
	alpha = 1.0 - smoothstep(0.99 * curveRadius, curveRadius, dist);
	
#ifdef OVERLAY
	float dpos = length(dFdy(wsPos)+ dFdx(wsPos));
	float l = 1.0-smoothstep(dpos * 0.75, dpos * 1.5, dist);
	alpha = l;
#endif

}



