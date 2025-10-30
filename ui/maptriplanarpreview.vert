#include "../common/util.sh"
#include "../mat/mesh.vert"

uniform vec2	uMeshTexCoord0Offsets;
uniform vec2	uMeshTexCoord1Offsets;

uniform mat4	uModelViewProjectionMatrix;

BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fTexCoord)
	OUTPUT1(vec3,fPosition)
	OUTPUT2(vec3,fNormal)
	OUTPUT3(vec3,fTangentBasisNormal)
END_PARAMS
{
	// Pull in the (potentially) undeformed vertex
	VertexState s = meshLoadVertex( vID, uMeshTexCoord0Offsets, uMeshTexCoord1Offsets );

	fTexCoord = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	fPosition = s.position;
	fNormal = s.normal;
	fTangentBasisNormal = decodeUint101010Normalized( vNormal );
	OUT_POSITION = mulPoint( uModelViewProjectionMatrix, vPosition );
}