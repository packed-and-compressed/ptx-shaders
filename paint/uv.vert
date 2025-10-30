#include "commonPaint.sh"
#include "../common/util.sh"
#include "../common/tangentbasis.sh"

uniform uint2   uTile;
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
	texCoord0.xy -= vec2(uTile);
	vec4 texSpace = vec4(2.0 * (texCoord0.xy) - vec2(1.0, 1.0), 0.0, 1.0);
	#ifdef RENDERTARGET_Y_DOWN
		texSpace.y *= -1;
	#endif
	OUT_POSITION = texSpace;
}
