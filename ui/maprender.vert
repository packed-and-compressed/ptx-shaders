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
END_PARAMS
{
	OUT_POSITION = mulPoint( uModelViewProjectionMatrix, vPosition );
	fTexCoord = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	fTexCoord += uUDIMTile;
}