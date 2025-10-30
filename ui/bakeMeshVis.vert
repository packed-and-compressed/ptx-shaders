#include "../common/util.sh"

USE_TEXTURE2D(tOffsetMask);
uniform vec2	uBakeOffset;
uniform mat4	uModelMatrix;
uniform mat4	uModelMatrixInvTrans;
uniform mat4	uViewProjectionMatrix;
uniform mat4	uModelBrushMatrix;

uniform vec2	uMeshTexCoord0Offsets;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
	INPUT6(vec3,vBakeDir)

	OUTPUT0(vec2,fTexCoord)
	OUTPUT1(vec3,fBrushCoord)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	float offsetMask = texture2DLod( tOffsetMask, texCoord0, 0.0 ).x;
	float offset = mix( uBakeOffset.x, uBakeOffset.y, offsetMask );

	vec3 bakeDir = normalize( mulVec( uModelMatrixInvTrans, decodeUint101010Normalized( vBakeDir ) ) );
	vec3 p = mulPoint( uModelMatrix, vPosition ).xyz + bakeDir * offset;
	
	fBrushCoord = mulPoint( uModelBrushMatrix, vPosition ).xyz;

	OUT_POSITION = mulPoint( uViewProjectionMatrix, p );
	fTexCoord = texCoord0;
}