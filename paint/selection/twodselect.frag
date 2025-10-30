#include "../../common/util.sh"

uniform vec4 uUVRect;	//UV rect occupied by the canvas viewport
USE_TEXTURE2D(tInput);


BEGIN_PARAMS
	INPUT0(vec2, fVPPos)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	vec2 vpCoords = fVPPos;
	//convert from viewport coords to coords of our selection texture
	vec2 localCoords = vpCoords.xy - uUVRect.xy;
	localCoords.xy /= uUVRect.zw;
	float selected = 0;
	// Prevent tiled sampling if coordinates are out of bounds
	if(max(localCoords.x, localCoords.y) <= 1 && min(localCoords.x, localCoords.y) >= 0)
	{ selected = texture2D(tInput, vec2(localCoords.x, 1.0-localCoords.y)).r; }
	
	//a very small value here simply indicates that there's geometry at this pixel
	OUT_COLOR0 = max(selected, 1.0/255.0);

}
