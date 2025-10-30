#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);
uniform ivec2 uBufferSize;
uniform int uFinalPass;	//strips the geometry marker
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS

{
	float geometryIndicator = 1.01 / 255.0;
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	vec4 tex = texture2D(tTex, coord);
	vec2 dUV = vec2(1.0, 1.0) / vec2(uBufferSize);

	float right = texture2D(tTex, coord + vec2(dUV.x, 0.0)).x;
	float left = texture2D(tTex, coord + vec2(-dUV.x, 0.0)).x;
	float up = texture2D(tTex, coord + vec2(0.0, dUV.y)).x;
	float down = texture2D(tTex, coord + vec2(0.0, -dUV.y)).x;
	
	//if a neighbor is selected and this pixel splits a UV gap (didn't get rendered when drawing tris in UV space)
	//then bleed its most selected neighbor onto it
	float maxNeighbor = max(right, max(left, max(up, down)));
	//if there's no geometry under this pixel and a neighbor is selected, select it too
	tex.x = mix(tex.x, maxNeighbor, float(tex.x == 0.0));
	tex.x = mix(tex.x, tex.x * step(geometryIndicator, tex.x), (float)uFinalPass);		//filter out the minimum poly indicator (1.0/255)
	OUT_COLOR0 = tex.x;

}
