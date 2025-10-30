#include "../commonPaint.sh"
#include "../../common/util.sh"

uniform mat4	uModelMatrix;
uniform float	uFlip;
uniform float	uOutput3D;
uniform mat4	uViewProjectionMatrix;
uniform vec2 	uOutputOffset;
uniform vec2 	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)


	OUTPUT0(vec2, fTexCoord)
	OUTPUT1(vec4, fVPPos)

END_PARAMS
{	
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	vec3 coord = mix(vec3(texCoord0.xy, 0.0),  mulPoint( uModelMatrix, vPosition ).xyz, uOutput3D);
	coord.xy += uOutputOffset;
	vec4 pos = mulPoint( uViewProjectionMatrix, coord );	
	fTexCoord = texCoord0.xy;
	OUT_POSITION = pos;
	fVPPos = pos;
}
