#ifndef DIRECT_LIGHT_PARAMS_SH
#define DIRECT_LIGHT_PARAMS_SH

struct LightRect
{
	vec3 p0;
	vec3 p1;
	vec3 p2;
	vec3 p3;
};

struct	LightParams
{
	vec3		color;				 // "colour"
	vec4		toSource;			 // vector from shaded point to light, directional ? 0 : 1
	vec3		direction;			 // normalized vector to light
	float		invDistance;		 // 1/distance to light
	float		distance;			 // distance to light
	float		attenuation;		 // dimming (distance and other factors)
	vec2		spotParams;			 // spotlight parameters ( cos(spotAngle/2), spotSharpness )
	vec3		size;				 // width, height, thickness
	vec3		axisX, axisY, axisZ; // 2D area axes
	float		id;					 // light index
	vec4		shadow;				 // shadow fraction
	bool 		twoSided;
	LightRect 	rect;
};

void	adjustAreaLightDiffuse( inout LightParams p, vec3 pos )
{
	HINT_BRANCH if( p.size.x + p.size.y > 0.0 )
	{
		vec2 uv = vec2( dot(-p.toSource.xyz,p.axisX), dot(-p.toSource.xyz,p.axisY) );
		uv = clamp( uv, -p.size.xy, p.size.xy );
		p.toSource.xyz += uv.x*p.axisX + uv.y*p.axisY;
		p.invDistance = rsqrt( dot(p.toSource.xyz, p.toSource.xyz) );
		p.distance = rcp( p.invDistance );
		p.direction = p.toSource.xyz * p.invDistance;
		p.attenuation = p.toSource.w ? (p.invDistance * p.invDistance) : 1.0;
	}
}

bool	adjustAreaLightSpecular( inout LightParams p, vec3 dir, float nrm )
{
	vec3 L = p.toSource.xyz;
	bool hit = false;
	float solidAngle = 0.0;
	float area = 0.0;

	HINT_BRANCH if( p.size.z > 0 )
	{
		//'sphere' area light
		solidAngle = (1.0 - sqrt(p.distance*p.distance - p.size.z*p.size.z) * p.invDistance);
		area = 3.1415926 * p.size.z*p.size.z;

		// closest point on sphere to ray
		vec3 closestPoint = dot(L, dir) * dir;
		vec3 centerToRay = closestPoint - L;
		float t = p.size.z * rsqrt( dot(centerToRay, centerToRay) );
		L = L + centerToRay * saturate(t);

		hit = t > 1.0 || t < 0.0;
	}
	else if( p.size.x + p.size.y > 0.0 )
	{
		//'rectangle' area light
		
		//a pretty crude stand-in for actual solid angle, but works fairly well
		solidAngle = 0.2 * (p.size.x + p.size.y) * p.invDistance;
		area = 4.0 * p.size.x * p.size.y;

		//project our vector onto the plane
		vec3 planeNormal = cross( p.axisX, p.axisY );
		float t = dot( L, planeNormal ) / dot( dir, planeNormal );
		vec3 p0 = t * dir;

		//transform point to 2D plane coords
		vec3 r = p0 - L;
		vec2 uv = vec2( dot(r,p.axisX), dot(r,p.axisY) );

		//see if the reflection vector hits the rectangle
		hit = abs(uv.x) < p.size.x && abs(uv.y) < p.size.y;
		if( !hit )
		{
			//ray doesn't intersect quad; check all 4 sides, find closest point on edge
			vec3 bestP = L; float bestDot = 0.0;
			vec3 ld, l0, P;
			vec2 sz;
			float dirL0, dirld, l0ld, t, dp;

			#define FINDQUADPOINT(axis1, size, axis2, sgn) \
				ld = axis1;\
				sz = size;\
				l0 = L + sz.y * axis2 * sgn;\
				dirL0 = dot(dir,l0), dirld = dot(dir,ld), l0ld = dot(l0,ld);\
				t = (l0ld*dirL0 - dot(l0,l0)*dirld) / (l0ld*dirld - dot(ld,ld)*dirL0);\
				t = clamp( t, -sz.x, sz.x );\
				P = l0 + t*ld;\
				dp = saturate(dot( normalize(P), dir ));\
				HINT_FLATTEN if( dp > bestDot ) { bestP = P; bestDot = dp; }

			FINDQUADPOINT(p.axisX, p.size.xy, p.axisY, 1.0);
			FINDQUADPOINT(p.axisX, p.size.xy, p.axisY, -1.0);
			FINDQUADPOINT(p.axisY, p.size.yx, p.axisX, 1.0);
			FINDQUADPOINT(p.axisY, p.size.yx, p.axisX, -1.0);
			#undef FINDQUADPOINT

			L = bestP;
		}
		else
		{ L = p0; }
	}

	//energy conservation estimate
	if( nrm < 0.0 )
	{
		area = max( area, 1e-7 );
		p.attenuation *= p.distance * p.distance / area;
	}
	else
	{ p.attenuation /= 1.0 + nrm * max( solidAngle, 0.0 ); }

	//export
	p.toSource.xyz = L;
	p.direction = normalize( p.toSource.xyz );
	return hit;
}

#endif