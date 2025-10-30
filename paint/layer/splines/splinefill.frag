#include "../../../common/util.sh"
uniform int uNumCurves;
USE_BUFFER(vec2, bCurveData);
uniform mat4 uProjection;
float cuberoot(float v) 
{
    return sign(v) * pow(abs(v), 1.0/3.0);
}

//Cardano's method, algorithm from https://pomax.github.io/bezierinfo

vec3 getCubicRoots(float pa, float pb, float pc, float pd) 
{
	float a = (3.0*pa - 6.0*pb + 3.0*pc);
	float b = (-3.0*pa + 3.0*pb);
	float c = pa;
	float d = (-pa + 3.0*pb - 3.0*pc + pd);

	float eps = 1e-7;
	
	//early check to see if this meeting could just be an email.  I mean a quadratic.
	if(abs(d) < eps) 
	{
		// this is not a cubic curve.
		// quadratic solution
		if(b*b-4.0*a*c >= 0.0)
		{
			float q = sqrt(b*b - 4.0*a*c);
			return vec3((q-b)/2.0/a, (-q-b)/2.0/a, -1.0);
		}
		return vec3(-1.0, -1.0, -1.0);
	}

	a /= d;
	b /= d;
	c /= d;
	
	float p = (3.0*b - a*a)/3.0;
	float p3 = p/3.0;
	float q = (2.0*a*a*a - 9.0*a*b + 27.0*c)/27.0;
	float q2 = q* 0.5;
	float discriminant = q2*q2 + p3*p3*p3;


  //case 1:  three real roots
	if(discriminant < 0.0) 
	{
		float mp33  = -(p*p*p)/27.0;
		float r    = sqrt( mp33 );
		float t    = -q / (2.0*r);
		float cosphi = clamp(t, -1.0, 1.0);
		float phi  = acos(cosphi);
		float crtr = cuberoot(r);
		//crtr = pow(r, 0.3333);
		float t1   = 2.0*crtr;
		float root1 = t1 * cos(phi/3.0) - a/3.0;
		float root2 = t1 * cos((phi+2.0*3.14159)/3.0) - a/3.0;
		float root3 = t1 * cos((phi+4.0*3.14159)/3.0) - a/3.0;
		return vec3(root1, root2, root3);
	}

  //case 2:  three real roots; two are equal
	if(discriminant == 0.0) 
	{
		float u1 = q2 < 0 ? cuberoot(-q2) : -cuberoot(q2);
		float root1 = 2.0*u1 - a/3.0;
		float root2 = -u1 - a/3.0;
		return vec3(root1, root2, -1.0);
	}

	//case 3:  one real root (two complex roots)
	float sd = sqrt(discriminant);
	float u1 = cuberoot(sd - q2);
	float v1 = cuberoot(sd + q2);
	float root1 = u1 - v1 - a/3;
	return vec3(root1, -1.0, -1.0);
}

vec2 bez(vec2 p1, vec2 p2, vec2 p3, vec2 p4, float t)
{
	return p4 * t * t * t + 3.0 * p3 * t * t * (1.0-t) + 3.0 * p2 * t * (1.0-t) * (1.0-t) + p1 * pow(1.0-t, 3);
}

//intersect the curve against a line going in the x+ direction
//based on a fine and extremely well-documented example at https://www.shadertoy.com/view/sdjBRy
int countIntersections(vec2 p1, vec2 p2, vec2 p3, vec2 p4, vec2 uv)
{
	//adjust so the points are relative to our line, then all we need to find is where the curve crosses zero!
	p1.y -= uv.y;
	p2.y -= uv.y;
	p3.y -= uv.y;
	p4.y -= uv.y;
	
	float minY = min(p1.y, min(p2.y, min(p3.y, p4.y)));
	float maxY = max(p1.y, max(p2.y, max(p3.y, p4.y)));
	float eps = 1e-7;
	if(minY > -eps || maxY < eps)
	{ return 0; }
	
	vec3 roots = getCubicRoots(p1.y, p2.y, p3.y, p4.y);

	int intersects = 0;
	for(int i = 0; i < 3; i++)
	{
		if(roots[i] > -eps && roots[i] < 1.0 + eps)
		{
			if(bez(p1, p2, p3, p4, roots[i]).x > uv.x)
			{ intersects++; }
		}
	}
	return intersects;
}

float pointInsideSpline(vec3 projected)
{
	//if a ray in the x-direction from this point intersects the spline an odd number of times,
	//the point is inside the filled spline.
	int intersects = 0;
	
	for(int i = 0; i < uNumCurves; i++)
	{
		vec2 a = bCurveData[i*4];
		vec2 b = bCurveData[i*4+1];
		vec2 c = bCurveData[i*4+2];
		vec2 d = bCurveData[i*4+3];
		intersects += countIntersections(a, b, c, d, projected.xy);
	}
	float val = float(intersects%2==1);
	return val;
}

#ifndef NO_FILL_MAIN
BEGIN_PARAMS
	INPUT0(vec4, fPosition)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 projected = mulPoint(uProjection, fPosition.xyz).xyz;
	float val = pointInsideSpline(projected);	
#ifdef OUTPUT_3D
	if(val == 0.0)
	{ discard; }
	OUT_COLOR0 = vec4(0.5, 0.2, 0.2, 0.25);
#else	
	OUT_COLOR0 = vec4(val,val, val, 1.0);
#endif
}
#endif	//ndef NO_FILL_MAIN

