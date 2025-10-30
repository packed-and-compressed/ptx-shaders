#include "commonPaint.sh"
#include "../common/util.sh"
//todo:  convert these into vertex attributes for more speed, if needed
uniform vec4 	uColor;
uniform mat4	uGeometry;
uniform vec2 	uSplotDelta;		//delta from the last paintsplot
uniform int		uFirstSplot;		//is this the first splot of the stroke?  If so, flow is calculated differently
uniform int		uConstantFlow;		//sometimes the position effects of flow are undesirable
uniform int 	uSplotNumber;		//acts as a random seed offset

//brush shape parameters
uniform float	uAspect;			//aspect of the texture we're painting to
uniform float   uBrushTextureAspect;	
uniform vec3 	uShading;		//flow, opacity, hardness

float getFlowAlpha(float brushRadius)
{
	//delta is used to generate opacity, so fake a length for a point-stroke
	float minDeltaMagnitude = brushRadius * float(uFirstSplot);
	//distance from previous splot to current
	float D2 = uSplotDelta.x*uSplotDelta.x + uSplotDelta.y*uSplotDelta.y;
	D2 = max(D2,  minDeltaMagnitude);
	float D = sqrt(D2);

	
	//Area of circular intersection: http://mathworld.wolfram.com/Circle-CircleIntersection.html
	float R = brushRadius;
	R = max(0.001, R);
	float R2 = R*R;
	float overlap = 2.0 * R * R * acos(D / (2.0 * R)) - 0.5 * D * sqrt(4.0 * R * R - D2);
	float area = 3.14159 * R * R;
	area = max(0.000001, area);
	
	float ratio = (area - overlap) / area;				//NEW!
	//flow mode uses a 4x?  8x? fudge value to so that 100% flow + minimal spacing produces a fully opaque stroke
	ratio = min(ratio * 5.0, 1.0);
	return ratio;
//	float airbrushRatio = mix(ratio, 1.0, 0.125 * float(airbrush));	//decrease the spacing effect of flow in airbrush mode
//	ratio = max(ratio, airbrushRatio * float(useBuildup));		//airbrush requires buildup (flow)
//	return ratio * 3.0;
	
}



BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
	OUTPUT2(vec3, fColor)	//flow, opacity, hardness
	OUTPUT3(float, fBrushRadius)
END_PARAMS
{
	float radius = length(col0(uGeometry)) * 1.0;
	
	//extra bleed on very small brushes
	float bleed = 2.25 - smoothstep(0.0, 0.015, radius);
	int vertexID = vID;
	vertexID -= 6 * (vID/6);
	fCoord = vec2(	(vertexID > 1 && vertexID != 5) ? 1.0 : 0.0,
					(vertexID == 0 || vertexID > 3) ? 1.0 : 0.0	);
	fCoord = 2.0*fCoord - vec2(1.0,1.0);
	fCoord *= bleed;
	
	
	//u and v vectors that define the splot's size and orientation
	vec2 u;
	vec2 v;

	//multiply the post-transformed offset by the target's aspect ratio to maintain proper shape
	vec2 p = mulVec(uGeometry, vec3(fCoord.x * uBrushTextureAspect, fCoord.y, 0.0)).xy;
	vec2 pCenter = mulPoint(uGeometry, vec3(0.0, 0.0, 0.0)).xy;
	p.x /= uAspect;
	p += pCenter;
	
	OUT_POSITION.xy = 2.0*p - vec2(1.0,1.0);
//	OUT_POSITION.x /= uAspect;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	fColor = uShading;
	fColor.r *= getFlowAlpha(radius);
	fColor.r = mix(fColor.r, uShading.r, float(uConstantFlow));
	fColor.r = clamp(fColor.r, 0.0, 1.0);
	fBrushRadius = radius;
	
	
}
