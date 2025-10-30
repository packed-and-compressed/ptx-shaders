
USE_TEXTURE2D(tMask);
USE_TEXTURE2D(tInterpolator);
USE_TEXTURE2D(tZero);
USE_TEXTURE2D(tBlack);
USE_TEXTURE2D(tWhite);
	
vec3 vectorNormalize(vec3 v)
{
	return normalize((v - 0.5)) * 0.5 + 0.5;
}

uniform float uNormalization;

//test/data viz parameters
uniform float uValue;
uniform float uUseValue;
BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	float s3 = 0.57735;
	vec3 plainBlack = vec3(-s3, -s3, -s3);
	vec3 normBlack = vec3(-s3, -s3, -s3) * 0.5 + 0.5;
	vec3 normWhite = vec3(s3, s3, s3) * 0.5 + 0.5;
	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	vec4 zero = texture2D(tZero, tc);
	vec4 black = texture2D(tBlack, tc);
	vec3 blackCloseness = (normBlack-black.rgb);
	float blackness = max(1.0-length(blackCloseness), 0.0);
	vec4 white = texture2D(tWhite, tc);
	vec3 whiteCloseness = (normWhite-white.rgb);
	float whiteness = max(1.0-length(whiteCloseness), 0.0);
	vec4 mask = texture2D(tInterpolator, tc);
	vec4 contents = texture2D(tMask, tc);
	mask = mix(mask, vec4(uValue, uValue, uValue, 1.0), uUseValue);
	vec4 result = mix(black, white, mask);
	result = mix(zero, result, mask.a);
	
	OUT_COLOR0 = result;
	
	OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb, vectorNormalize(OUT_COLOR0.rgb), uNormalization); 
	float showThruness = min(whiteness, blackness);
//	OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb)
	OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb, mask.rgb, showThruness * mask.a * uNormalization);
	
	//normalize again
	OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb, vectorNormalize(OUT_COLOR0.rgb), uNormalization);
	float inSquare = 1.0 - step(3.0, mod(IN_POSITION.y, 1024.0));
	inSquare = max(inSquare, 1.0 - step(3.0, mod(IN_POSITION.x, 1024.0)));
	OUT_COLOR0 = mix(OUT_COLOR0, vec4(0.0, 0.0, 0.0, 1.0), inSquare);
//	OUT_COLOR0 = mix(OUT_COLOR0, mask, 0.999);
//	OUT_COLOR0.rgb = mix(vec3(0.0), vec3(1.0), showThruness);
//	OUT_COLOR0.rgb = mix(OUT_COLOR0.rgb, vec3(1.0, 0.0, 0.0), whiteness);

}

