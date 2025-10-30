//This shader collects geometry at the location of the paint splot, which is then
//used to compensate for distortion 
#include "../common/util.sh"

uniform mat4	uModelMatrix;
//uniform mat4	uModelBrush;
uniform mat4 	uModelInverseTranspose;
uniform mat4	uModelBrushMatrix;
uniform mat4	uPostXform;	//for screenspace projection, in this context

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)

	OUTPUT0(vec3, fNormal)		
    OUTPUT1(vec4, fLocalCoord)	//spherespace vertex
	

END_PARAMS
{	
	vec4 p = mulPoint( uModelMatrix, vPosition ); 
	vec4 proj = mulPoint(uModelBrushMatrix, p.xyz);
	proj.xyz = mulPoint(uPostXform, proj.xyz/proj.w).xyz * proj.w;	//apply post-transform
	fLocalCoord = proj;
	
	OUT_POSITION = proj;
	fNormal = normalize(mulPoint(uModelInverseTranspose, decodeUint101010Normalized(vNormal)).xyz);

}
