#include "stencilsample.frag"

BEGIN_PARAMS
	 INPUT0(vec4, fPosition)	
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 position = fPosition.xyz / fPosition.w;
	vec2 stencilCoord = position.xy;
	float stencil = sampleStencil(stencilCoord);
	OUT_COLOR0 = vec4(stencil, stencil, stencil, 1.0);
}
