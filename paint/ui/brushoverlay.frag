#include "../stencilsample.frag"

uniform int		uPixelMode;
uniform ivec2	uTargetSize;
uniform ivec2	uMousePos;
uniform float	uBrightening;	//for stencil highlighting
uniform float 	uPixelScale;
uniform vec2	uUVOffset;
USE_TEXTURE2D(uSplotTexture);
USE_SAMPLER(sNearSampler);
USE_SAMPLER(sLinearSampler);
uniform vec4	uOverlayColor;
uniform float 	uViewAspect;

#ifdef CLONE_STAMP
#include "data/shader/paint/clonestamputils.sh"

USE_TEXTURE2D(tCloneDestTexture);
uniform vec4	uWarningCloneColor;
uniform float	uCheckCloneWarning;
#endif

//pixel gridlines for zoomed in overlay
float getGrid(vec2 UV, float gridSize)
{
	vec2 dcxView = dFdx(UV) * max(uPixelScale, 1.0);;
	vec2 dcyView = dFdy(UV) * max(uPixelScale, 1.0);;

	vec2 uv1 = floor(UV + dcxView * gridSize + dcyView * gridSize);
	vec2 uv2 = floor(UV + dcxView * gridSize - dcyView * gridSize);
	vec2 uv3 = floor(UV - dcxView * gridSize - dcyView * gridSize);
	vec2 uv4 = floor(UV - dcxView * gridSize + dcyView * gridSize);
	vec2 uvmin = min(uv1, min(uv2, min(uv3, uv4)));
	vec2 uvmax = max(uv1, max(uv2, max(uv3, uv4)));
	return (uvmin.x != uvmax.x || uvmin.y != uvmax.y);
}

#define HIGHLIGHT_THRESHOLD 0.1
//returns -1 if we're just outside the region, 1 if just inside, otherwise 0
int getPixelBorder(vec2 coord, float valHere)
{
	vec2 dx = dFdx(coord) * max(uPixelScale, 1.0);
	vec2 dy = dFdy(coord) * max(uPixelScale, 1.0);
	float valUp = textureWithSampler(uSplotTexture, sNearSampler, coord - dy).r;
	float valDown = textureWithSampler(uSplotTexture, sNearSampler, coord + dy).r;
	float valLeft = textureWithSampler(uSplotTexture, sNearSampler, coord - dx).r;
	float valRight = textureWithSampler(uSplotTexture, sNearSampler, coord + dx).r;
	const float threshold = HIGHLIGHT_THRESHOLD;
	valUp = 	step(threshold, valUp);
	valDown = 	step(threshold, valDown);
	valLeft = 	step(threshold, valLeft);
	valRight = 	step(threshold, valRight);
	valHere = 	step(threshold, valHere);
	float maxNearby = max(valUp, max(valDown, max(valLeft, valRight)));
	float minNearby = min(valUp, min(valDown, min(valLeft, valRight)));	//start here!
	

	if(maxNearby > 0.0 && valHere == 0.0)		//just outside pixel region?
	{ return -1; }
	if(minNearby == 0.0 && valHere != 0.0)		//just inside pixel region?
	{ return 1; }
	return 0;
}

vec4 findSoftEdges(float brushValLinear, float thresh, vec4 overlayColor)
{
	float fval = 0.0;
	int bvi = int(brushValLinear * 65535.0);
	bvi = bvi >> 4;
	float decodedValue = float(bvi) / 2047.0;
	
	//find the rate of change of brush value per pixel--how many pixels away from
	//the threshold value are we?
	float dtx = abs(dFdx(decodedValue));
	float dty = abs(dFdy(decodedValue));
	float ddr = sqrt(dtx*dtx+dty*dty) * uPixelScale;
	float lineDist = (decodedValue-thresh)/max(ddr, 0.0001);

	//fatten the line and make it two-tone for visibility
	float jiggle = 0.1;
	float edgeFadeDist = 0.5;

	//let's darken just the inner edge of the splot for contrast
	float innerEdge = step(0.0 + edgeFadeDist, lineDist) 
			*  (1.0 - smoothstep(1.0 + edgeFadeDist * 1.0, 2.0 + edgeFadeDist * 1.0, lineDist));
	
	//thicker outer edge outside the splot for a smoother border
	jiggle = 1.0;
	float edge2 = smoothstep(-jiggle-edgeFadeDist, -jiggle, lineDist) * (1.0 - smoothstep(jiggle, jiggle+edgeFadeDist, lineDist));
	
	//outside fade is more transparent, softening the border
	if(lineDist < 0.0)
	{ edge2 *= 0.25; }

	fval = mix(fval, 1.0, max(edge2, innerEdge));
	
	//darker color for the edge-find to give us contrast on top of a variety of colors
	vec3 darker = vec3(.3, .5, .2);
	overlayColor.rgb = mix(overlayColor.rgb, darker, innerEdge * 0.5);

	vec4 edgeFindResult = overlayColor;
	if(decodedValue + fval < thresh)
	{  edgeFindResult *= 0.0; }
	else
	{ edgeFindResult.a += fval; }
	return edgeFindResult;
}

vec4 getPixelGrid(float brushValNearest, vec2 UV, float amount, vec4 overlayColor)
{
	int brushBits = int(brushValNearest * 65535.0);	//brush value secretly contains a bitmask!
	float brushCoord = float(brushBits & 15)/15.0 * 2.0 + 1.5;
	float cleanNearest = float(brushBits >> 5)/2047.0;

	//give the pixel grid a little offset to make it distinctive
	float thinGrid = getGrid(UV, 0.5);
	float thickGrid = getGrid(UV, 1.5);
	thickGrid = thinGrid; thinGrid = 0.0;	//let's try a one-tone grid instead
	float fadeStart = 1.5;
	float fadeDist = 0.5;

	float gridFade = 1.0-smoothstep(fadeStart, fadeStart + fadeDist, brushCoord);
	gridFade = smoothstep(0.0, HIGHLIGHT_THRESHOLD, brushValNearest);
	vec4 gridResult = overlayColor;
	gridResult = mix(gridResult, vec4(0, 0, 0, 1), thickGrid-thinGrid);

	float gridMix = mix(thinGrid, thickGrid, 0.5);
	gridMix = 0.1 * gridMix + 0.4 * saturate(thickGrid-thinGrid);	//the dark section of the grid is more prominent, for background visibility
	gridResult.a = gridFade * saturate(gridMix);
	return gridResult;

}

vec4 makeOverlay(float brushValLinear, float brushValNearest, vec2 UV, vec2 texCoord, vec2 VPCoord)
{
	float thresh = HIGHLIGHT_THRESHOLD;	//highlight threshold
	//pixel grid?  
	vec2 gridDelta = abs(dFdx(UV)) + abs(dFdy(UV));
	
	//the grid appears as we zoom in closer to the pixels
	float pixelviewStart = 1.0;	//start of the transition to pixel view.  Lower number = closer to mesh (pixels larger on screen)
	float pixelviewEnd = 0.4;		//when the transition is complete
	float usePixelView = saturate(1.0-smoothstep(pixelviewEnd, pixelviewStart, length(gridDelta) * uPixelScale));
	usePixelView *= float(brushValNearest > 0.0);
	
	vec4 overlayColor = uOverlayColor;
#ifdef CLONE_STAMP
	if( uCheckCloneWarning )
	{ 
		vec4 texSpace = computeUnitModelUVs( texCoord, uModelUVRange );
		float strokeOpacity = textureWithSampler(tCloneDestTexture, sLinearSampler, texSpace.xy).r;
		overlayColor = mix(uWarningCloneColor, overlayColor, strokeOpacity); 
	}
#endif

	int pixelBorderi = getPixelBorder(texCoord, brushValNearest);
	float pixelBorder = float(pixelBorderi != 0);
	vec4 gridResult = getPixelGrid(brushValNearest, UV, usePixelView * pixelBorder, overlayColor);
	
	//pixel area border overrides any grids.  it's gotta be very clear.
	if(pixelBorderi == 1)
	{ gridResult = vec4(.0, .0, .0, .75); }
	else if(pixelBorderi == -1)
	{ gridResult = overlayColor;}
	 gridResult.a = mix(gridResult.a, 0.7, float(pixelBorderi != 0));

	//preview the brush outline at lower zoom by finding edges on the interpolated brush splot
	vec4 edgeFindResult = findSoftEdges(brushValLinear, thresh, overlayColor);
	
	vec4 result = mix(edgeFindResult, gridResult, usePixelView);
	
	//highlight the stencil area
	float stencil = sampleStencil(VPCoord * vec2(uViewAspect, 1.0)); 
	result += vec4(1, 0, 0, 1) * stencil * step(0.001, result.r) * uBrightening * 0.5 * step(HIGHLIGHT_THRESHOLD, brushValNearest);
	return result;
}


BEGIN_PARAMS
	INPUT0(vec2, fTexCoord)
	INPUT1(vec4, fVPPos)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	vec2 texCoord = fTexCoord + uUVOffset;
#ifdef UDIMS
	//UDIMs are confined to their home unit
	if(max(texCoord.x, texCoord.y) > 1.0 || min(texCoord.x, texCoord.y) < 0.0)
	{ discard; }
#endif
	float splotNear = textureWithSampler(uSplotTexture, sNearSampler, texCoord).r;
	float splotLinear = textureWithSampler(uSplotTexture, sLinearSampler, texCoord).r;
	OUT_COLOR0 = makeOverlay(splotLinear, splotNear, texCoord * vec2(uTargetSize), texCoord, fVPPos.xy/fVPPos.w);
}
