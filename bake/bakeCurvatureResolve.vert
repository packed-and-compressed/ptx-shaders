#include "../common/util.sh"
#include "../common/tangentbasis.sh"

uniform mat4	uModelMatrixInvTrans;

uniform vec4	uLayoutScaleBias;
uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT1(vec2,fTexCoord)
	OUTPUT2(vec3,fTangent)
	OUTPUT3(vec3,fBitangent)
	OUTPUT4(vec3,fNormal)
END_PARAMS
{
	OUT_POSITION.xy = uLayoutScaleBias.xy * decodeUVs( vTexCoord0, uMeshTexCoord0Offsets ) + uLayoutScaleBias.zw;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	
	fTexCoord = OUT_POSITION.xy * vec2(0.5,-0.5) + vec2(0.5,0.5);

	vec3 tangent = decodeUint101010Normalized( vTangent.xyz );
	vec3 normal = decodeUint101010Normalized( vNormal );
	vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

	fTangent = mulVec( uModelMatrixInvTrans, tangent );
	fBitangent = mulVec( uModelMatrixInvTrans, bitangent );
	fNormal = mulVec( uModelMatrixInvTrans, normal );
}
