#include "commonPaint.sh"
#include "../common/util.sh"

USE_TEXTURE2D(tStencilTex);

uniform mat4 	uStencilTextureMatrix;
uniform int 	uStencilWrap;
uniform float 	uStencilFade; 
uniform float 	uStencilInvert;
uniform vec2  	uStencilPadding;
uniform float	uStencilBrightness;
uniform float	uStencilContrast;

float sampleStencil(vec2 stencilCoord)
{
	stencilCoord = mulPoint(uStencilTextureMatrix, vec3(stencilCoord.xy, 0.0)).xy;
	stencilCoord /= uStencilPadding;
	stencilCoord = stencilCoord * 0.5 + 0.5;
	vec2 fadeCoords = fract(abs(stencilCoord)) * 2.0 - 1.0;
	float fadeLevel = distanceToValue(getVignette(fadeCoords, 1.0-uStencilFade), 0.00001, 1.0-uStencilFade);
	float inBounds = step(0.f, stencilCoord.x) * step(0.f, stencilCoord.y);
		inBounds *= (step(stencilCoord.y, 1.0)) * (step(stencilCoord.x, 1.0));
	inBounds = mix(inBounds, 1.0, float(uStencilWrap));
	fadeLevel = mix(fadeLevel, fadeLevel * inBounds, float(uStencilFade > 0.0));
	vec4 st = texture2D(tStencilTex, stencilCoord);
	float stencil = st.x * st.a;
	stencil = mix(stencil, 1.0-stencil, uStencilInvert) * inBounds;
	
	stencil = saturate((stencil-0.5) * uStencilContrast + 0.5); //apply contrast
	stencil = saturate(stencil * uStencilBrightness);

	return saturate(stencil * fadeLevel) * inBounds;
}
