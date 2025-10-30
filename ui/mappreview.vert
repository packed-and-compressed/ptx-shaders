#include "../common/util.sh"

uniform mat4	uModelViewProjectionMatrix;
uniform vec2	uMeshTexCoord0Offsets;
uniform vec2	uUDIMTile;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec2,fTexCoord)
	OUTPUT1(vec3,fPosition)
	OUTPUT2(vec3,fNormal)
END_PARAMS
{
	fTexCoord = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	fTexCoord += uUDIMTile;

	fPosition = vPosition;
	fNormal = decodeUint101010Normalized( vNormal );
	OUT_POSITION = mulPoint( uModelViewProjectionMatrix, vPosition );
}