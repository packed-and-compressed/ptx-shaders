#include "../common/util.sh"

uniform vec4	uVerts[3];
uniform vec4	uUVs[3];

BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	//fourth component is the splot radius
	OUTPUT0(vec3,fNormal)		
    OUTPUT1(vec3,fLocalCoord)	//spherespace vertex
	OUTPUT2(float, fAlphaMult)

END_PARAMS
{
	vec3 s0 = uVerts[1].xyz - uVerts[0].xyz; 
	vec3 s1 = uVerts[2].xyz - uVerts[1].xyz;
	vec3 n = normalize(cross(s0, s1));
	fLocalCoord = uUVs[vID].xyz;
	OUT_POSITION = uUVs[vID];
	OUT_POSITION.xy = OUT_POSITION.xy * 2.0 - 1.0;
	fNormal = n * 0.5 + 0.5;
	fAlphaMult = 0.25;
	
}
