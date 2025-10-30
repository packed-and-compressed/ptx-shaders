#include "commonPaint.sh"
#include "../common/util.sh"
#include "../common/tangentbasis.sh"

uniform mat4 	uNormalMatrix;
uniform mat4	uModelMatrix;
uniform float	uFlip;
uniform uint2   uTile;
uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)

	OUTPUT0(vec2,fCoord)
	OUTPUT1(vec3,fPosition)
	OUTPUT3(vec3,fNormal)
	OUTPUT4(vec3,fTangent)
	OUTPUT5(vec3,fBitangent)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );

	//paint-space position is vertex pos when 3D painting, or tex coord when emulating 2D painting
	vec3 vertexPos = vec3(texCoord0.xy, 0.0);

	vec3 tangent = decodeUint101010Normalized(vTangent.xyz);
	vec3 normal = decodeUint101010Normalized(vNormal);
	vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

	fTangent = normalize( mulVec( uNormalMatrix, tangent ) );
	fNormal = normalize( mulVec( uNormalMatrix, normal ) );
	fBitangent = normalize( mulVec( uNormalMatrix, bitangent ) );
	fCoord = texCoord0.xy;
	texCoord0.xy -= vec2(uTile);
	//output can be in 3D space for viewport preview, or 2D texturespace space for UV preview or actual painting
	vec4 texSpace = vec4(2.0*(texCoord0.xy) - vec2(1.0,1.0), 0.0, 1.0);
	texSpace.y *= uFlip;

	OUT_POSITION = texSpace;

}
