#include "layerformat.sh"

USE_TEXTURE2D( tTexture );
uniform int		uMaxPaddingRange;

uniform vec2	uPixelSize;

void findNearestSDF( vec2 sampleCoord, vec2 offset, float sdfStepSize, inout int maxSteps, inout float nearestSDF )
{
	int pixelSkip = 2;
	for(unsigned int i = 0;i<maxSteps;i++)
	{
		sampleCoord += offset*pixelSkip;
		vec4 uvt = texture2DLod( tTexture, sampleCoord, 0.0 );
		if( uvt.w != 0 )//this sample has an sdf value
		{
			maxSteps = i;
			if( uvt.z < 0 )//inside the skirt region? - factor that in
			{ uvt.w = -uvt.w; }
			float estimatedSDF = uvt.w + ((sdfStepSize*maxSteps)/pixelSkip);
			nearestSDF = nearestSDF == 0 ? estimatedSDF : min(nearestSDF, estimatedSDF);
		}
	}
}

float estimateNearestSDF( vec2 sampleCoord )
{
	float nearestSDF = 0;
	int maxSteps = 512;
	float sdfStepSize = (1.0f / uMaxPaddingRange);//how big is a pixel in sdf terms
	findNearestSDF( sampleCoord, vec2( 0, -uPixelSize.y ), sdfStepSize, maxSteps, nearestSDF );
	findNearestSDF( sampleCoord, vec2( -uPixelSize.x, 0 ), sdfStepSize, maxSteps, nearestSDF );
	findNearestSDF( sampleCoord, vec2( uPixelSize.x, 0 ), sdfStepSize, maxSteps, nearestSDF );
	findNearestSDF( sampleCoord, vec2( 0, uPixelSize.y ), sdfStepSize, maxSteps, nearestSDF );

	//search diagonally using a modified scale
	sdfStepSize *= 1.41421356237309504880f;
	findNearestSDF( sampleCoord, vec2( -uPixelSize.x, -uPixelSize.y ), sdfStepSize, maxSteps, nearestSDF );
	findNearestSDF( sampleCoord, vec2( uPixelSize.x, -uPixelSize.y ), sdfStepSize, maxSteps, nearestSDF );
	findNearestSDF( sampleCoord, vec2( -uPixelSize.x, uPixelSize.y ), sdfStepSize, maxSteps, nearestSDF );
	findNearestSDF( sampleCoord, vec2( uPixelSize.x, uPixelSize.y ), sdfStepSize, maxSteps, nearestSDF );
	return nearestSDF;
}

vec4 fillSDF( vec2 sampleCoord )
{
	vec4 uvt = texture2DLod( tTexture, sampleCoord, 0.0 );
	vec4 result = uvt;
	float sdf = uvt.w;
	if( result.z > 0 && result.w == 0 )//inside island and no sdf
	{
		result.w = estimateNearestSDF( sampleCoord);
	}
	return result;
}

BEGIN_PARAMS
	INPUT0( vec2, fTexCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	OUT_COLOR0 = fillSDF( fTexCoord );
}
