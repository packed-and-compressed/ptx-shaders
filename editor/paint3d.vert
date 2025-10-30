#include "../common/util.sh"

uniform mat4	uModelBrushMatrix;
uniform float	uFlip;

uniform vec2	uMeshTexCoord0Offsets;
uniform vec2 	uUDIMTile;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec3,fBrushCoord)
END_PARAMS
{
	fBrushCoord = mulPoint( uModelBrushMatrix, vPosition ).xyz;

	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	texCoord0 -= uUDIMTile;
	OUT_POSITION.xy = 2.0 * texCoord0 - vec2(1.0,1.0);
	OUT_POSITION.y *= uFlip;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}