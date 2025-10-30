///////////////////////////
//use pre-solved floodfill mask to modify pixels from original
USE_TEXTURE2D( tFloodFillMask );
USE_TEXTURE2D( tFillMask );
USE_TEXTURE2D( tTextureSelectionMask );
USE_TEXTURE2D( tStencilRemap );

uniform int		uFlipVertical;
uniform float	uPixelSize;
uniform float	vPixelSize;
uniform int		uAA;
uniform float	uAAStrength;
uniform float	uRangeStart;
uniform int		uSolid;
USE_TEXTURE2D( tTextureOriginalSrc );
uniform vec2	uReferenceUV;

float getSampleWeight(int nx, int ny, float sample)
{
	if( sample == 0 )
	{ return 0; }
	else if( nx && ny )
	{ return 0.09032552387832490846513400858032f; }
	return 0.12773958089718192913319473481787f;
}

float getScaledSampleMatch(vec2 UV, vec2 referenceUV, float threshold)
{
	vec4 referenceColor = texture2DLod( tTextureOriginalSrc, referenceUV, 0.0 );
	vec4 sampleColor = texture2DLod( tTextureOriginalSrc, UV, 0.0 );

	float xdiff = sampleColor.x-referenceColor.x;
	float ydiff = sampleColor.y-referenceColor.y;
	float zdiff = sampleColor.z-referenceColor.z;
	if( xdiff < 0 ) xdiff = -xdiff;
	if( ydiff < 0 ) ydiff = -ydiff;
	if( zdiff < 0 ) zdiff = -zdiff;
	float rgblen = sqrt((xdiff*xdiff)+(ydiff*ydiff)+(zdiff*zdiff));
	float percentDiff = rgblen / 1.73205080757;
	float match = 1.0f - percentDiff;
	if( sampleColor.w == 0 && referenceColor.w == 0 )
	{ match = 1; }

	float value = 0;
	if( match > 0 )
	{
		value = (match-threshold)/(1.0f-threshold);
	}

	return value;
}

float scaleFillWeight(float value, vec2 UV)
{
	if( uSolid != 0 )
	{
		if( value >= uRangeStart )
		{ value = 1; }
		else
		{ value = 0; }
	}
	else
	{
		if( value >= uRangeStart )
		{ value = getScaledSampleMatch(UV, uReferenceUV, uRangeStart); }
		else
		{ value = 0; }
	}
	return value;
}

vec3 getSampleRow(vec2 uvCenter, int ny)
{
	vec3 result;
	vec2 uva = uvCenter + vec2(-uPixelSize, vPixelSize*ny);
	vec2 uvb = uvCenter + vec2(0, vPixelSize*ny);
	vec2 uvc = uvCenter + vec2(+uPixelSize, vPixelSize*ny);
	result.x = texture2DLod( tFloodFillMask, uva, 0.0 ).x;
	result.y = texture2DLod( tFloodFillMask, uvb, 0.0 ).x;
	result.z = texture2DLod( tFloodFillMask, uvc, 0.0 ).x;
	result.x = scaleFillWeight(result.x, uva);
	result.y = scaleFillWeight(result.y, uvb);
	result.z = scaleFillWeight(result.z, uvc);
	return result;
}

vec3 getSampleRowWeights(vec2 uvCenter, int ny, vec3 samples)
{
	vec3 result;
	result.x = getSampleWeight(-1, ny, samples.x);
	result.y = getSampleWeight(0, ny, samples.y);
	result.z = getSampleWeight(1, ny, samples.z);
	return result;
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	if( uFlipVertical != 0 )
	{ fCoord.y = 1.0f - fCoord.y; }

	float value = 0;

	vec4 selectMask = texture2DLod( tTextureSelectionMask, fCoord, 0.0 );
	if( selectMask.x > 0 )
	{
		if( uAA != 0 && uAAStrength > 0 )
		{
			vec4 mask = texture2DLod( tFillMask, fCoord, 0.0 );
			if( mask.x != 0 )
			{
				vec3 top = getSampleRow(fCoord, -1);
				vec3 middle = getSampleRow(fCoord, 0);
				vec3 bottom = getSampleRow(fCoord, 1);
				vec3 topWeights = getSampleRowWeights(fCoord, -1, top);
				vec3 middleWeights = getSampleRowWeights(fCoord, 0, middle);
				vec3 bottomWeights = getSampleRowWeights(fCoord, 1, bottom);
				float totalSamples = (top.x*topWeights.x)+(top.y*topWeights.y)+(top.z*topWeights.z)+(middle.x*middleWeights.x)+(middle.y*middleWeights.y)+(middle.z*middleWeights.z)+(bottom.x*bottomWeights.x)+(bottom.y*bottomWeights.y)+(bottom.z*bottomWeights.z);
				float totalWeight = topWeights.x+topWeights.y+topWeights.z+middleWeights.x+middleWeights.y+middleWeights.z+bottomWeights.x+bottomWeights.y+bottomWeights.z;
				value = totalSamples;
				value += ((1.0-totalWeight)*middle.y);
				value = (value*uAAStrength)+((1.0f-uAAStrength)*middle.y);
			}
		}
		else
		{
			vec4 mask = texture2DLod( tFloodFillMask, fCoord, 0.0 );
			value = mask.x;
			if( mask.x != 0 )
			{
				if( uSolid != 0 )
				{
					if( value >= uRangeStart )
					{ value = 1; }
					else
					{ value = 0; }
				}
				else
				{
					value = getScaledSampleMatch(fCoord, uReferenceUV, uRangeStart);
				}
			}
		}
		
		vec4 stencilRemap = texture2DLod( tStencilRemap, fCoord, 0.0 );
		value *= stencilRemap.r;

	}

	OUT_COLOR0.x = value;
	OUT_COLOR0.y = value;
	OUT_COLOR0.z = value;
	OUT_COLOR0.w = value;
}
