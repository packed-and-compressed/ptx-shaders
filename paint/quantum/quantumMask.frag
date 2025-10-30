#include "quantummultiplication.sh"
//USE_TEXTURE2D(tCurveR);
//USE_TEXTURE2D(tCurveG);
//USE_TEXTURE2D(tCurveB);
USE_TEXTURE2D(tInterpolator);
USE_TEXTURE2D(tBlack);
USE_TEXTURE2D(tWhite);
#ifndef SINGLE_CHANNEL
#ifdef QC_SPLIT_BLUE
USE_TEXTURE2D(tBlackB);
USE_TEXTURE2D(tWhiteB);
#endif
#endif

uniform vec3 uValue;
uniform float uUseValue;
uniform float uNormalization;
uniform float uSingleComponent;
uniform float uWatermark;
uniform float uOpacity;

BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	
	vec4 result = texture2D(tWhite, tc);
	vec4 maskTex = texture2D(tInterpolator, tc);
	vec4 existing = texture2D(tBlack, tc);
#ifndef SINGLE_CHANNEL
#ifdef QC_SPLIT_BLUE
	existing.b = texture2D(tBlackB, tc).r;
	result.b = texture2D(tWhiteB, tc).r;
#endif
#endif

	float mask = maskTex.r * uOpacity;
	mask = mix(mask, uValue.r, uUseValue);
	
	OUT_COLOR0 = existing * (1.0-mask) + result * mask;
	vec3 normed = normalize((OUT_COLOR0.rgb - 0.5)) * 0.5 + 0.5;
	OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb, normed, uNormalization); 
	float inSquare = 1.0 - step(3.0, mod(IN_POSITION.y+512.0 + 64.0 * sin(IN_POSITION.x *  3.14159/512.0), 1024.0));
	inSquare = max(inSquare, 1.0 - step(3.0, mod(IN_POSITION.x+512.0 + 64.0 * sin(IN_POSITION.y *  3.14159/512.0), 1024.0)));
	OUT_COLOR0 = mix(OUT_COLOR0, vec4(0.0, 0.0, 0.0, 1.0), inSquare * (1.0-uUseValue) * uWatermark);
}

