#include "data/shader/common/util.sh"

uniform vec2	uMeshTexCoord0Offsets;
uniform vec2 	uUDIMTile;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets ) - uUDIMTile;
	OUT_POSITION.xy = 2.0*texCoord0 - vec2(1.0,1.0);
    // flip the y coordinate
    OUT_POSITION.y *= -1.0;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}
