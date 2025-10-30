#include "../bake/utils.frag"

BEGIN_PARAMS
	INPUT0(vec3,fPosition)
	INPUT1(vec3,fTangent)
	INPUT2(vec3,fBitangent)
	INPUT3(vec3,fNormal)
	INPUT4(vec2,fTexCoord)
	INPUT5(vec3,fBakeDir)

	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
END_PARAMS
{
	OUT_COLOR0.xyz = fPosition;
	OUT_COLOR0.w = 1.0;

	OUT_COLOR1.xyz = -findTraceDirection( fPosition, normalize(fBakeDir), fTexCoord );
	OUT_COLOR1.w = texture2D( tTraceDirectionMask, fTexCoord ).x;
}
