//pass geometry along in UV
#include "../common/util.sh"
#include "../common/tangentbasis.sh"

uniform mat4	uModelMatrix;
uniform mat4 	uModelInverseTranspose;

uniform vec2	uMeshTexCoord0Offsets;
uniform int2	uUDIMTile;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)

	OUTPUT0(vec3, fPosition)
	OUTPUT1(vec3, fNormal)		
    OUTPUT2(vec3, fTangent)
    OUTPUT3(vec3, fBitangent)

END_PARAMS
{	
	fPosition = mulPoint( uModelMatrix, vPosition ).xyz;

	vec3 normal = decodeUint101010Normalized(vNormal);
	vec3 tangent = decodeUint101010Normalized(vTangent.xyz);
	vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

	fNormal = mulVec(uModelInverseTranspose, normal).xyz;
	fTangent = mulVec(uModelInverseTranspose, tangent).xyz;
	fBitangent = mulVec(uModelInverseTranspose, bitangent).xyz;

	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	texCoord0 -= vec2( uUDIMTile ); // udim offset
	vec4 texSpace = vec4(2.0*(texCoord0.xy) - vec2(1.0,1.0), 0.0, 1.0);
	texSpace.z = 0.5;
	OUT_POSITION = texSpace;
}
