#include "paintcompositeutil.sh"

uniform int uErasing;
uniform int uSingleChannel;
uniform vec4 uColor;
USE_TEXTURE2D(tStroke);
USE_TEXTURE2D(tExisting);
USE_TEXTURE2D(tTexture);

//convert between RGBA and RG-as-RA textures
void toRGBA(inout vec4 c)
{	c = mix(c, c.rrrg, float(uSingleChannel)); }


void toNativeChannels(inout vec4 c)
{	c = mix(c, c.ragg, float(uSingleChannel)); }

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 strokeCoords = fCoord;

	vec4 inStroke = texture2D(tStroke, strokeCoords);
	vec4 existing = texture2D(tExisting, fCoord);
	vec4 tex =		texture2D(tTexture, fCoord);
	float alpha = inStroke.r;

	toRGBA(existing);
	
	vec4 surfaceColor = vec4(1.0, 1.0, 1.0, 1.0);
	surfaceColor.a *= alpha;
	surfaceColor *= uColor;
	surfaceColor *= tex;
	OUT_COLOR0 = blendRGBA(existing, surfaceColor);
	vec4 eraseColor = vec4(existing.rgb, existing.a * (1.0-alpha));

	//full opacity erase goes to 0, 0, 0, 0
	eraseColor = mix(eraseColor, vec4(0, 0, 0, 0), step(0.995, alpha));

	OUT_COLOR0 = mix(OUT_COLOR0, eraseColor, float(uErasing));
	toNativeChannels(OUT_COLOR0);
}
