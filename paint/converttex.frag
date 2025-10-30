#include "commonPaint.sh"
#include "../common/util.sh"
#include "layer/layerformat.sh"

uniform int uSRGBOutput;	//needed for dithering
uniform int u16In;
uniform int u16Out;
uniform int uDither;
uniform vec2 uDitherSeed;
uniform int uMultiChannelIn;
uniform int uMultiChannelOut;

USE_TEXTURE2D(tTex);
BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	vec2 coord = vec2(fCoord.x, 1.0-fCoord.y);
	vec4 result = texture2D(tTex, coord);
	
	///handle monochannel data
	if(uMultiChannelIn == 0)
	{ result = result.rrrg; }
	
	if(!u16Out && u16In)	//dithering SRGB data in linear space looks bad, so convert it beforehand if necessary
	{		
		if(uSRGBOutput)		
		{ result.rgb = linearTosRGB(result.rgb); }
		result = layerDither8bitRGBA( result, coord + uDitherSeed );
		if(uSRGBOutput)
		{ result.rgb = sRGBToLinear(result.rgb); }
	}
	
	
	if(uMultiChannelOut == 0)	//outputing grayscale?  
	{
		float g = (result.r+result.g+result.b) / 3.0;
		result = vec4(g, result.a, g, g);
	}
	
	OUT_COLOR0 = result;
}
