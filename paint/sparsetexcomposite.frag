#include "paintcompositeutil.sh"

uniform int uSingleChannel;
USE_TEXTURE2D(tExisting);
USE_TEXTURE2DARRAY(tTexture);
USE_TEXTURE2D(tAtlas);
uniform vec2 uOutputSizeInv;
//convert between RGBA and RG-as-RA textures
void toRGBA(inout vec4 c)
{	c = mix(c, c.rrrg, float(uSingleChannel)); }

vec4 sampleSparseTex(vec2 texCoord)
{
	int w; int h; int mips;
	imageSize2D(tAtlas, w, h, mips);
	uint2 tCoord = uint2(texCoord.x * w, texCoord.y * h);
	float atlasSlice = imageLoad(tAtlas, tCoord).x * 65535.0;
	vec3 tc = vec3(fract(texCoord * vec2(w, h)), atlasSlice);
	vec2 adjust =  step(tc.xy, 0.00002);  
	tc.xy += uOutputSizeInv * vec2(w, h) * adjust * 0.5;
	vec4 valueV4 = texture2DArrayLod(tTexture, tc, 0); 
	return valueV4;	
}

void toNativeChannels(inout vec4 c)
{	c = mix(c, c.ragg, float(uSingleChannel)); }

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 existing = texture2D(tExisting, fCoord);
	vec4 tex =		sampleSparseTex(fCoord);
	toRGBA(existing);
	toRGBA(tex);	
	OUT_COLOR0 = blendRGBA(existing, tex);
	toNativeChannels(OUT_COLOR0);
}
