#include "../../../common/util.sh"

#ifdef OUTPUT_3D
	uniform mat4 uViewProjectionMatrix;
#endif
uniform mat4 uModelMatrix;

uniform vec2 uMeshTexCoord0Offsets;
uniform vec2 uUVOffset;	//for UDIMs
BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)

	OUTPUT0(vec4, fPosition)
END_PARAMS
{
	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets ); 
	
	//we need viewport position and z depth relative to camera
	fPosition = mulPoint(uModelMatrix, vPosition);
#ifdef OUTPUT_3D
	OUT_POSITION = mulPoint(uViewProjectionMatrix, fPosition.xyz);
#else
	OUT_POSITION = vec4((texCoord0 + uUVOffset) * 2.0 - 1.0, 0.0, 1.0);
#endif
}
