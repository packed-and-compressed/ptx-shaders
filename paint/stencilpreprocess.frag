#include "commonPaint.sh"
#include "../common/util.sh"
uniform float 	uBlurAmount;
uniform vec2 	uTexSizeInv;
uniform vec2 	uTexSize;
uniform int     uPaddingPixels;
uniform int		uWrapping;
uniform vec2 	uSampDir;

//clip textures if there're gonna be sampled out of bounds--if wrapping is off
float inBounds(vec2 tc)
{
	if(uWrapping)
	{ return 1.0; }
	float ib = step(0.f, tc.x) * step(0.f, tc.y);
		ib *= (step(tc.y, 1.0)) * (step(tc.x, 1.0));
	return ib;
}

USE_TEXTURE2D(tStencilTex);
BEGIN_PARAMS
	 INPUT0(vec2, fCoord)	
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 tex0 = -uTexSizeInv * float(uPaddingPixels);	//starting point for sampling the stencil  
	vec2 texMult = uTexSize / (uTexSize+float(uPaddingPixels)*2.0);
	
	//adjust the stencil coord for padding
	vec2 stencilCoord = tex0 + fCoord / texMult;
	vec4 s0 = texture2D(tStencilTex, stencilCoord);
	float stencilHere = s0.x * s0.a;
	stencilHere *= inBounds(stencilCoord);
	
	if(uBlurAmount > 0.0)
	{
		float dx = 1.0 * uTexSizeInv.x;
		float dy = 1.0 * uTexSizeInv.y;
		int size = min(int(uBlurAmount * 0.125 * float(uTexSize.y)), 512);
		float totalWeight = 1.0;
		for(int x = 1; x < size; x++)
		{
			float dist = float(x);
			float weight = 1.0 - float(x)/size;
			weight = pow(weight, 2.0);	
			vec2 tc1 = stencilCoord + vec2(dx, dy) * uSampDir * dist;
			vec2 tc2 = stencilCoord + vec2(dx, dy) * -uSampDir * dist;
			float ib1 = inBounds(tc1);
			float ib2 = inBounds(tc2);
			totalWeight += weight * (ib1+ib2);
			vec4 s1 = texture2D(tStencilTex, tc1);
			vec4 s2 = texture2D(tStencilTex, tc2);
			stencilHere += s1.x * s1.a * weight * ib1;
			stencilHere += s2.x * s2.a * weight * ib2;
		}
		stencilHere /= totalWeight;
	}

	OUT_COLOR0 = vec4(stencilHere, stencilHere, stencilHere, 1.0);
}
