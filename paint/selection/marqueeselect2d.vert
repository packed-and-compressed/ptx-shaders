#include "../../common/util.sh"

uniform float	uFlip;
uniform vec2 	uUVOffset;
uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec2, fVPPos)		//viewport position
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	vec2 vertexPos = texCoord0.xy;
	fVPPos = vertexPos.xy;
	
	texCoord0 += uUVOffset;
	vec4 texSpace = vec4(2.0*(texCoord0.xy) - vec2(1.0,1.0), 0.5, 1.0);
	texSpace.y *= uFlip;
	OUT_POSITION = texSpace;
//	OUT_POSITION = fVPPos;
}
