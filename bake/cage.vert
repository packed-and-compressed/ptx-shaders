#include "../common/util.sh"

uniform mat4	uModelMatrix;
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

	OUTPUT0(vec3,fPosition)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	OUT_POSITION.xy = uLayoutScaleBias.xy * texCoord0 + uLayoutScaleBias.zw;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	
	fPosition = mulPoint( uModelMatrix, vPosition ).xyz;
}
