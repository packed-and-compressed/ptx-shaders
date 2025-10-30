#include "../common/util.sh"

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
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	texCoord0 -= uUDIMTile;
	
	vec2 tc = uScaleBias.xy * texCoord0 + uScaleBias.zw;
	OUT_POSITION.xy = 2.0*tc - vec2(1.0,1.0);
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}
