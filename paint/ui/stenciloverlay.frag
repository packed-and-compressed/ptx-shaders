#include "../stencilsample.frag"

uniform float uAlpha; 
BEGIN_PARAMS
    INPUT0(vec2,fCoord)	
	OUTPUT_COLOR0(vec4)
END_PARAMS
{	
	vec2 stencilCoord =  fCoord * 2.0 - 1.0;
	float stencil = sampleStencil(stencilCoord);
	OUT_COLOR0 = vec4(vec3(stencil, stencil, stencil), uAlpha);
}
