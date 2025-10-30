#include "../../common/util.sh"

//brings in a texture, maps it to a viewport area, and uses it as the selection input
uniform float	uShadowing;

USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tInput);


BEGIN_PARAMS
	INPUT0(vec4, fVPPos)
	INPUT1(vec3, fNormal)
	INPUT2(float, fZ)
	INPUT3(vec3, fRelPos)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	vec3 vpCoords = fVPPos.xyz / fVPPos.w;
	vpCoords.xy = vpCoords.xy * 0.5 + 0.5;
	float inVP = step(0.0, vpCoords.x) * step(vpCoords.x, 1.0) * step(0.0, vpCoords.y) * step(vpCoords.y, 1.0);
	vec2 localCoords = vpCoords.xy;
	float selected = texture2D(tInput, vec2(localCoords.x, 1.0-localCoords.y)).r;	
	
	float depth = texture2D(tDepth, vec2(vpCoords.x, 1.0-vpCoords.y)).x;
	vec3 norm = normalize(fNormal);
	float slope = max(abs(norm.x), abs(norm.y));
	float bias = (1.0 + slope * 4.0) * -0.0048 * abs(fZ);
	vec3 fromCamera = normalize(fRelPos);
	float viewDot = dot(fromCamera, norm);
	if(fZ < depth + bias || viewDot > 0.0)
	{ selected *= mix(1.0, 2.0 / 255.0, uShadowing); }		//don't select this pixel just yet, but flag it
	
	//a very small value here simply indicates that there's geometry at this pixel
	OUT_COLOR0 = max(inVP * selected, 1.0/255.0);
}
