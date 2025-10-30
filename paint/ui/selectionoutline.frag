#include "../commonPaint.sh"
#include "../../common/util.sh"
#include "../../common/udimsample.sh"
//single pass uses the UDIM of the selection
#ifdef SINGLE_PASS
#include "../../common/udim.sh"
#else
USE_TEXTURE2D(tSelection);
#endif	//SINGLE_PASS

#ifdef USE_DEPTH
USE_TEXTURE2D(tDepth);
uniform ivec2 uBufferSize;
#endif
uniform float uTime;
uniform float uLowThreshold;	//for masking
uniform float uMaskAlpha;

float sampleAt(vec2 coord)
{
	#ifdef SINGLE_PASS
		return sampleUDIM(coord).r;
	#else
		return texture2D(tSelection, coord).r;
	#endif	//SINGLE_PASS
}

//uniform int uMode;
BEGIN_PARAMS
	INPUT0(vec2, fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	//these are the basic factors that decide if we put an outline at this pixel:
	float selectionBorder = 0.0;	//boundary in the screensapce selection
	float depthJump = 0.0;			//something (mesh or other object) occluding the paintable mesh---low threshold
	float bigDepthJump  = 0.0;		//occlusion---high threshold
	vec2 selectionGradient = vec2(0.0, 0.0);
	vec2 depthGradient = vec2(0.0, 0.0);

#ifdef USE_DEPTH
	float depth = texture2D(tDepth, fTexCoord).r;
#endif	
	vec4 overlayColor = vec4(0.0, 0.0, 0.0, 0.0);
	float selectionMask = sampleAt(fTexCoord);
	float dx = dFdx(selectionMask);
	float dy = dFdy(selectionMask);
	
	
	vec2 dF = vec2(dFdx(fTexCoord.x), dFdy(fTexCoord.y));
	float tdx = max(dF.x, 1.0/2000.0);
	float tdy = -min(abs(dF.y), abs(1.0/2000.0));
	tdx = dF.x;
	tdy = dF.y;
	
	vec2 texCoord = fTexCoord.xy;

	vec2 texLeft = texCoord + vec2(-tdx, 0.0);
	vec2 texRight = texCoord + vec2(tdx, 0.0);
	vec2 texUp = texCoord + vec2(0.0, tdy);
	vec2 texDown = texCoord + vec2(0.0, -tdy);

#ifdef USE_DEPTH
	float dDepthX = dFdx(depth);
	float dDepthY = dFdy(depth);
	
	float dDepth = sqrt(dDepthX * dDepthX + dDepthY * dDepthY);
	bigDepthJump = step(1.0, dDepth);
	
	float depthLeft = texture2D(tDepth, texLeft).r;
	float depthRight = texture2D(tDepth, texRight).r;
	float depthUp = texture2D(tDepth, texUp).r;
	float depthDown = texture2D(tDepth, texDown).r;
	float depthMin = min(depthLeft, min(depthRight, min(depthUp, depthDown))) - depth;;
	float depthMax = max(depthLeft, max(depthRight, max(depthUp, depthDown))) - depth;
	
	float depthThresh = 0.05;
	float depthChanged = step(depthThresh, depthMax);
	depthChanged *= 1.0-step(-depthThresh, depthMin);
	
	float minDepthDelta = min(abs(depthMin), abs(depthMax));
	float maxDepthDelta = max(abs(depthMin), abs(depthMax));
	float depthRatio = maxDepthDelta / max(minDepthDelta, 0.0001);

	float bigRatio = step(5.0, depthRatio);

	//check slope continuity to detect depth jumps

	depthJump = bigRatio;		//big depth ratio means at least a small depth jump
	bigDepthJump *= bigRatio;	//big depth jump depends on absolute value change 
	
	depthGradient = vec2(depthRight-depthLeft, depthUp-depthDown);

#endif

	//edge detection!
	
	//sample this texel and its pixel-space neighbors.  If we're sampling near the border,
	//it should be zero so we get lines when we select-all
	float selected = selectionMask;
	float uMax = 1.0;
	float vMax = 1.0;
#ifdef SINGLE_PASS
	uMax = (float)uShape.y;	//yes, y (cols)
	vMax = (float)uShape.x;	//yes, x (rows)
#endif
	vec4 selectLeft = sampleAt(texLeft) * float(texLeft.x > 0.0);
	vec4 selectRight = sampleAt(texRight)  * float(texRight.x < uMax);
	vec4 selectUp = sampleAt(texUp) * float(texUp.y < vMax+tdy * 2.0);	//some fudging here
	vec4 selectDown = sampleAt(texDown) * float(texDown.y > -tdy * 2.0);	//and here
	float threshold = 0.5;
	selectionGradient = vec2(selectRight.x-selectLeft.x, selectUp.x-selectDown.x);
	float leastSelected = min(selectUp.x, min(selectDown.x, min(selectRight.x, selectLeft.x)));
	float mostSelected = max(selectUp.x, max(selectDown.x, max(selectRight.x, selectLeft.x)));
	mostSelected = max(mostSelected, selected);

	//if this or a neighboring pixel is >= our threshold and a neighboring pixel is < our threshold, this is part of the selection edge
	//we can also just do "if *this* pixel is >= threshold", but that sometimes gets little breaks in the line
	selectionBorder = step(threshold, mostSelected);
	selectionBorder *= 1.0-step(threshold, leastSelected);
	float nonSelected = step(mostSelected, threshold) * step(uLowThreshold, selected);

	// We also need the mathematical gradient (direction of slope)
	//from the gradient, we can get the direction of the isolines along which the ants march

	dx = selectRight.x - selectLeft.x;
	dy = selectDown.x-selectUp.x;
	
	
	vec2 isoDir = vec2(dy, dx);
	
#ifdef USE_DEPTH
	//if we can't get an isoline for selection (such as when there's a depth change but solid mask)
	//use the direction of the depth change to generate the ants
	isoDir = mix(isoDir, vec2(dDepthY, dDepthX), step(length(isoDir), 0.01));
#endif
	//make sure isodir isn't empty
	isoDir = mix(isoDir, vec2(1.0, 1.0), saturate(1.0-length(isoDir) * 10000.0));

	//normalize the isoline direction
	isoDir /= max(length(isoDir), 0.0001);
	
	//quantize the iso-line vector.  This cleans up the marching ants around edges
	isoDir = ceil(isoDir * 3.0) / 3.0;
	isoDir = normalize(isoDir);		//and re-normalize!
	
	//the phase of the ant-line is determined by our pixel-space texture coordinates
	//dividing by the texcoord derivatives gives us those pixel-space coordinates
	vec2 sampleCoord = IN_POSITION.xy;
	float phase = dot(isoDir, sampleCoord);

	float dashSize = 8.0;
	
	//turn our phase into a dashed line
	float c = mod(float(int(phase / dashSize + uTime * 2.0)), 2.0);
	c = mod(c + 2.0, 2.0);	//handle c < 2

	vec4 lineColor = vec4(c, c, c, 1.0);
	float fillIt = 0.0;
	
	
	//standard selection border.  selectionBorder && !depthJump 
	fillIt = saturate(ceil(selectionBorder) * (1.0 - depthJump));
	float fakeLine = 0.0;
	//yes border if occluded and there's no selection gap.  bigDepthJump && !selectionBorder && (leastSelected > threshold)
	float SONSG = bigDepthJump * (1.0-selectionBorder) * step(threshold, leastSelected);
	float dsx = dFdx(SONSG);
	float dsy = dFdy(SONSG);
	float nearsonsg = saturate(step(0.1, max(abs(dsx), abs(dsy))));
	SONSG = max(nearsonsg, SONSG);
	fillIt = max(fillIt, SONSG);
	fakeLine = SONSG * 0.5;	//this border tends to be thinner, so reduce the fake-line-ness
	
	//and if selected mesh has non-selected mesh behind it, draw a border.  mixedBorder && selectionGradient.dot(depthGradient) > 0.01
	float mixedBorder = selectionBorder * depthJump;
	float mixedOcclusionResult = mixedBorder * step(0.01, dot(selectionGradient, depthGradient));
	fakeLine = max(fakeLine, mixedBorder);
	fillIt = mix(fillIt, mixedOcclusionResult, mixedBorder);
	lineColor = mix(lineColor, lineColor * 0.35, fakeLine);

	overlayColor = mix(overlayColor, lineColor, fillIt);
	
	
	OUT_COLOR0 = overlayColor;
	
#ifdef USE_DEPTH
	//debug access
	/*
	selectionMask = step(0.1, selectionMask);
	if(uMode == 0)
	{
		OUT_COLOR0 = mix(OUT_COLOR0, vec4(1, 0, 0, 0.25), selectionMask * (1.0-fillIt));
	}
	selectionBorder = ceil(selectionBorder);
	if(uMode > 0 && uMode < 4)
	{ OUT_COLOR0.ra = mix(OUT_COLOR0.ra, vec2(1.0, 1.0), selectionBorder); }
	if(uMode == 2)
	{ OUT_COLOR0.ga = mix(OUT_COLOR0.ga, vec2(1.0, 1.0), depthJump);}
	if(uMode == 3)
	{ OUT_COLOR0.ba = mix(OUT_COLOR0.ba, vec2(1.0, 1.0), mixedBorder); }
	if(uMode == 4)
	{OUT_COLOR0.ra = mix(OUT_COLOR0.ra, vec2(selectionMask, 1.0), 0.5);}
	*/
	
	//viewport selection outline can get false outlines at screen edges, so let's just mask them off
	OUT_COLOR0 *= step(1.0, IN_POSITION.x) * step(1.0, IN_POSITION.y) 
		* step(IN_POSITION.y+1.0, float(uBufferSize.y)) * step(IN_POSITION.x+1.0, float(uBufferSize.x));
#endif
	vec4 maskColor = vec4(0.007, 0.007, 0.015, pow(uMaskAlpha, 0.33));
	OUT_COLOR0 = mix(OUT_COLOR0, maskColor, nonSelected);
//	{OUT_COLOR0.ra = mix(OUT_COLOR0.ra, vec2(1.0, 0.5), selectionMask * (1.0-fillIt));}
}


//TODO:  integrate AA outline as per:

/*

//the fragment shader
fixed4 frag(v2f i) : SV_TARGET{
  //you can use almost any value as a gradient
  float gradient = i.uv.x;
  //calculate the change
  float halfChange = fwidth(gradient) / 2;
  //base the range of the inverse lerp on the change over one pixel
  float lowerEdge = 0.5 - halfChange;
  float upperEdge = 0.5 + halfChange;
  //do the inverse interpolation
  float stepped = (gradient - lowerEdge) / (upperEdge - lowerEdge);
  stepped = saturate(stepped);
}

*/

