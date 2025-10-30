#include "commonPaint.sh"

uniform float 		uNoiseSeed;
uniform int			uBrushShape;		//CIRCLE, SQUARE, TEXTURED
uniform ivec2			uTargetSize;		//needed for smoothing very small brushes     
//for animated brushes
uniform int 		uBrushFrame;
uniform int			uBrushFrameCount;
uniform int			uSingleChannel;
USE_TEXTURE2D(tBrushTex);


float sampleBrush(vec2 texCoord, float hardness, float brushRadius, int useTexture)
{
	//feather the brush stroke. 
	float rEffectiveSquare = getVignette(texCoord, hardness);
	float rEffectiveCircle = length(texCoord);
	float distanceVal = mix(rEffectiveCircle, rEffectiveSquare, (float)useTexture);
	float feather = distanceToValue(distanceVal, brushRadius, hardness);

	
	if(useTexture != 0)		//texture!
	{
		unsigned int frame = uBrushFrame;
		unsigned int frameCount = max(uBrushFrameCount, 1);
		float sampleWidth = 1.0 / float(frameCount);
		float sampleStart = sampleWidth * float(frame%frameCount);
		vec4 allMyExes = texture2D(tBrushTex, vec2((texCoord.x * 0.5 + 0.5) * sampleWidth + sampleStart, texCoord.y * -0.5 + 0.5));
		feather *= allMyExes.r * allMyExes.a;
		
		//make sure we're in-bounds
		feather *= 1.0 - step(1.0, max(abs(texCoord.x), abs(texCoord.y)));
	}
	
	return feather;
}

BEGIN_PARAMS
    INPUT0(vec2,fCoord)
    INPUT2(vec3,fColor)	//flow, opacity, hardness
    INPUT3(float,fBrushRadius)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	int useTex = (int)(uBrushShape != 0);
	float feather;
	
	
	//multi-sample the brush
	vec2 brushPixelSize = (vec2(uTargetSize) * fBrushRadius * 2.0);
	if(length(brushPixelSize) < 5.0)
	{
		vec2 dUV = vec2(2.0, 2.0) / brushPixelSize;	
		dUV *= 0.25;	//brush-space AA delta, in pixels
		float f1 = sampleBrush(fCoord + dUV * vec2(1.0, 1.0), fColor.b, fBrushRadius, useTex);
		float f2 = sampleBrush(fCoord + dUV * vec2(-1.0, 1.0), fColor.b, fBrushRadius, useTex);
		float f3 = sampleBrush(fCoord + dUV * vec2(-1.0, -1.0), fColor.b, fBrushRadius, useTex);
		float f4 = sampleBrush(fCoord + dUV * vec2(1.0, -1.0), fColor.b, fBrushRadius, useTex);
		feather = (f1 + f2 + f3 + f4) / 4.0;
	}
	else
	{
		feather = sampleBrush(fCoord, fColor.b, fBrushRadius, useTex);
	} 
	
	float mask = feather;
	float opacity = fColor.g;
	float flow = fColor.r;
	
	OUT_COLOR0 = vec4(mask * flow, 1.0, 1.0, opacity * mask);
//	OUT_COLOR0.r = uOpacity;
//	OUT_COLOR0.w *= feather;
	
	//writing to an RG16 buffer is weird....
//	OUT_COLOR0 = mix(OUT_COLOR0, vec4(OUT_COLOR0.r, 1.0, 1.0, OUT_COLOR0.a), float(uSingleChannel));
}


