#include "../commonPaint.sh"
#include "../../common/util.sh"
#include "../../common/tangentbasis.sh"

uniform mat4 	uNormalMatrix;
uniform mat4	uModelMatrix;
uniform float	uFlip;
uniform vec2	uUVShift;		//for drawing UDIMs

uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)


	OUTPUT0(vec2, fCoord)
	OUTPUT1(vec3, fNormal)
	OUTPUT2(vec3, fTangent)
	OUTPUT3(vec3, fBitangent)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );

	vec3 normal = decodeUint101010Normalized(vNormal);
	vec3 tangent = decodeUint101010Normalized(vTangent.xyz);
	vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

	fNormal = mulVec(uNormalMatrix, normal);
	fTangent = mulVec(uModelMatrix, tangent);
	fBitangent = mulVec(uModelMatrix, bitangent);
	fCoord = texCoord0.xy;

	vec4 texSpace = vec4(2.0*(texCoord0.xy + uUVShift) - vec2(1.0,1.0), 0.0, 1.0);
	texSpace.y *= uFlip;

	OUT_POSITION = texSpace;

}
