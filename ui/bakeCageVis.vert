#include "../common/util.sh"
#include "../common/tangentbasis.sh"

uniform mat4	uModelMatrix;
uniform mat4	uModelMatrixInvTrans;
uniform vec4	uScaleBias;
uniform vec2 	uUDIMTile;

uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
	INPUT6(vec3,vBakeDir)

	OUTPUT0(vec3,fPosition)
	OUTPUT1(vec3,fTangent)
	OUTPUT2(vec3,fBitangent)
	OUTPUT3(vec3,fNormal)
	OUTPUT4(vec2,fTexCoord)
	OUTPUT5(vec3,fBakeDir)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets ) - uUDIMTile;
	OUT_POSITION.xy = uScaleBias.xy * texCoord0 + uScaleBias.zw;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	
	fPosition = mulPoint( uModelMatrix, vPosition ).xyz;

	vec3 tangent = decodeUint101010Normalized(vTangent.xyz);
	vec3 normal = decodeUint101010Normalized(vNormal);
	vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

	fTangent = normalize( mulVec( uModelMatrixInvTrans, tangent ) );
	fNormal = normalize( mulVec( uModelMatrixInvTrans, normal ) );
	fBitangent = normalize( mulVec( uModelMatrixInvTrans, bitangent ) );
	fTexCoord = texCoord0;
	fBakeDir = mulVec( uModelMatrixInvTrans, decodeUint101010Normalized(vBakeDir) );
}
