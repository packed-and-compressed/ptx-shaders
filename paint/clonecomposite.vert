#include "data/shader/common/util.sh"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/common/texcoord.sh"

uniform mat4	uModelMatrix;
uniform mat4	uNormalMatrix;
uniform vec2	uMeshTexCoord0Offsets;
uniform vec4	uViewportScaleBias;
uniform uint	uActiveUVIslandId;

BEGIN_PARAMS
	INPUT0(vec3,	vPosition)
	INPUT1(vec3,	vNormal)
	INPUT2(vec3, 	vTangent)
	INPUT3(vec2,	vUV)
	INPUT4(vec4, 	vCloneData)
	INPUT5(vec2,	vTexCoord0)
	
	OUTPUT0(vec2,   fBufferCoord)
	OUTPUT1(vec3,   fNormal)
	OUTPUT2(vec3,   fTangent)
	OUTPUT3(vec3,   fBitangent)
	OUTPUT4(vec3,   fUVUp)
		
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );

	vec4 scaleBias = uViewportScaleBias;

	vec2 pos = texCoord0;
	pos = 2.0 * pos - vec2(1.0,1.0);
	#ifdef RENDERTARGET_Y_DOWN
		pos.y = -pos.y;
		scaleBias.w = -scaleBias.w;
	#endif
	pos = (pos * scaleBias.xy) + scaleBias.zw;

	OUT_POSITION.xy = pos;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );

	fBufferCoord	= texCoord0;

	vec3 modelUVUp = vCloneData.xyz;
	fUVUp = mulVec(uModelMatrix, modelUVUp).xyz;

	vec3 normal		= mulVec(uNormalMatrix, vNormal.xyz).xyz;
	vec3 tangent	= mulVec(uModelMatrix, vTangent).xyz;
	vec3 bitangent	= reconstructBitangent( tangent, normal, 1.f );
			
	fNormal			= normal;
	fTangent		= tangent;
	fBitangent		= bitangent;

	//discard the tri if not inside the currently processed UVIsland
	uint uvISlandId = floor(vCloneData.w);
	if( uvISlandId != uActiveUVIslandId )
	{ OUT_POSITION.z = 99.0; }
}