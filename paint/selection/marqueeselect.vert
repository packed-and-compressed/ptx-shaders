#include "../../common/util.sh"

uniform mat4 	uNormalMatrix;
uniform mat4	uModelMatrix;
uniform float	uFlip;
uniform mat4	uViewProjectionMatrix;
uniform mat4	uViewMatrix;
uniform vec2 	uUVOffset;
uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec4, fVPPos)		//viewport position
	OUTPUT1(vec3, fNormal)
	OUTPUT2(float, fZ)
	OUTPUT3(vec3, fRelPos)
END_PARAMS
{

	vec3 vertexPos = mulPoint(uModelMatrix, vPosition).xyz;
	fZ = mulPoint(uViewMatrix, vertexPos).z;
	fRelPos = mulPoint(uViewMatrix, vertexPos).xyz;
	fVPPos = mulPoint(uViewProjectionMatrix, vertexPos);
	fNormal = (mulVec(uNormalMatrix, decodeUint101010Normalized(vNormal)));
	fNormal = normalize(mulVec(uViewMatrix, fNormal));

	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	texCoord0 += uUVOffset;
	vec4 texSpace = vec4(2.0*(texCoord0.xy) - vec2(1.0,1.0), 0.0, 1.0);
	texSpace.y *= uFlip;
	OUT_POSITION = texSpace;
//	OUT_POSITION = fVPPos;
}
