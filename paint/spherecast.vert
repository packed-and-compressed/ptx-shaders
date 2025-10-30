#include "../common/util.sh"

uniform mat4	uModelMatrix;
uniform vec3	uOrigin;
uniform vec3	uU;
uniform vec3	uV;
uniform vec3 	uN;
uniform float	uRadius;
uniform mat4 	uModelInverseTranspose;
uniform int		u3DSpace;			//Are we doing this in 3D space? (i.e. viewport preview)
uniform mat4	uCameraMatrix;		//modelviewprojection of camera

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	//fourth component is the splot radius
	OUTPUT0(vec3,fNormal)		
    OUTPUT1(vec3,fLocalCoord)	//spherespace vertex
	OUTPUT2(float,fAlphaMult)

END_PARAMS
{
	// transform the point into spherespace with the camera pointing down the normal	
	fNormal = normalize(mulVec(uModelInverseTranspose, decodeUint101010Normalized(vNormal))) * 0.5 + 0.5;

	vec3 p = mulPoint( uModelMatrix, vPosition ).xyz; 
	p -= uOrigin;
	p /= uRadius * 1.5;  // increase our radius a bit to responsd to geometry before we hit it

	float planeDistance = dot(uN, p);
	float uPart = dot(uU, p);
	float vPart = dot(uV, p);
	vec3 ssPos = vec3(uPart, vPart, planeDistance);  // planeDistance * n + u * uPart + v * vPart;

	fLocalCoord = ssPos;

	vec4 projCoord = mulPoint(uCameraMatrix, mulPoint( uModelMatrix, vPosition ).xyz);

	OUT_POSITION.xyz = ssPos;
	OUT_POSITION.z = 0.0;
	OUT_POSITION.w = 1.0;
	OUT_POSITION = mix(OUT_POSITION, projCoord, float(u3DSpace));

	fAlphaMult = mix(1.0, 5.0, float(u3DSpace));
}
