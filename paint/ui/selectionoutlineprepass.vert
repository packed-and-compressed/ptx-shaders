#include "../commonPaint.sh"
#include "../../common/util.sh"

uniform mat4	uModelMatrix;
uniform float	uFlip;
uniform float	uOutput3D;
uniform mat4	uViewProjectionMatrix;

uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)


	OUTPUT0(vec2, fTexCoord)

END_PARAMS
{	
	vec4 pos = mulPoint( uViewProjectionMatrix, mulPoint( uModelMatrix, vPosition ).xyz );	
	fTexCoord = decodeUVs( vTexCoord0.xy, uMeshTexCoord0Offsets );
	OUT_POSITION = pos;
}
