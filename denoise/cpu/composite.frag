#include "compositeFunc.sh"

uniform float uAlpha;
uniform int2  uFlipScaleBias;

USE_TEXTURE2D_NOSAMPLER(tColor);
USE_TEXTURE2D_NOSAMPLER(tDenoised);

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	const int2 coord = int2(IN_POSITION.xy);
	const int2 denoisedCoord = int2( coord.x, uFlipScaleBias.x*coord.y+uFlipScaleBias.y );

	vec4 color = imageLoad( tColor, coord );
	vec3 denoised = imageLoad( tDenoised, denoisedCoord ).rgb;
	OUT_COLOR0 = compositeFunc( color, denoised, uAlpha );
}
