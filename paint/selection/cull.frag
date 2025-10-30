#define USE_FALLOFF
#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);

uniform float 	uMaxAngle;
uniform float	uFalloffAmount;
uniform vec3	uRefNormal; 
USE_TEXTURE2D(tTSNormalMap);

float calcFalloff(vec3 ref, vec3 test)
{
	float dotProduct = dot(ref, test);
	return angleFalloff(dotProduct, uMaxAngle, uFalloffAmount);
}

BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	INPUT1(vec3, fNormal)
	INPUT2(vec3, fTangent)
	INPUT3(vec3, fBitangent)

	OUTPUT_COLOR0(float)
END_PARAMS

{
	float l;
	vec3 normHere = fNormal;;
	vec2 texCoord = fCoord;
	CALC_WS_NORMAL;
	vec2 coord = vec2(fCoord.x, fCoord.y);
	vec4 tex = saturate(texture2D(tTex, coord));
	float falloff = calcFalloff(uRefNormal, normHere);
	
	//passing in a zero vector skips the cull but still inserts the geometry marker
	falloff = mix(falloff, 1.0, step(length(uRefNormal), 0.0));
	tex.r *= falloff;
	tex.r = max(tex.r, 1.0/255.0);		//minimum value of 1/255 for so we can use a bleed shader to close the gaps
	
	OUT_COLOR0 = tex.r;

}
