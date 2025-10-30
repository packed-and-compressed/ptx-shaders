#define USE_FALLOFF
#include "commonPaint.sh"

///////////////////////////
//grayscale map for all pixels as compared against sample at "uReferenceUV" from "tTextureOriginalSrc""

USE_TEXTURE2D( tTextureOriginalSrc );
USE_TEXTURE2D( tClickedTexture );
USE_TEXTURE2D( tTSNormalMap );

USE_TEXTURE2D( tTextureSelectionMask );

uniform vec2		uReferenceUV;
uniform int			uFlipVertical;
uniform int			uUseDotProduct;	//for directional maps
uniform int			uCullSamples;
uniform int			uCullNormalMap;

uniform float 		uMaxAngle;
uniform float		uFalloffAmount;
uniform vec3		uRefNormal;


float calcFalloff(vec3 ref, vec3 test)
{
	float dotProduct = dot(ref, test);
	return angleFalloff(dotProduct, uMaxAngle, uFalloffAmount);
}


BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	INPUT1( vec3, fPosition )
	INPUT3( vec3, fNormal )
	INPUT4( vec3, fTangent )
	INPUT5( vec3, fBitangent )	

	OUTPUT_COLOR0(float)
END_PARAMS
{
	if( uFlipVertical != 0 )
	{ fCoord.y = 1.0f - fCoord.y; }
	vec4 referenceColor = texture2DLod( tClickedTexture, fract(uReferenceUV), 0.0 );
	vec4 sampleColor = texture2DLod( tTextureOriginalSrc, fCoord, 0.0 );
	
	float rgblen = length((referenceColor-sampleColor));
	float percentDiff = rgblen / 2;
	
	//use a dot product for directions
	if(uUseDotProduct != 0 && dot(referenceColor.xyz, referenceColor.xyz) * dot(sampleColor.xyz, sampleColor.xyz) > 0.0)
	{
		float refLength = length(referenceColor.xyz);
		float sampLength = length(sampleColor.xyz);
		
		percentDiff = dot(referenceColor.xyz/refLength, sampleColor.xyz/sampLength);
		percentDiff *= sqrt(refLength * sampLength);
	}
	
	float match = 1.0f - percentDiff;
	float value = 0;
	if( match > 0 )
	{
		value = match;

		if( uCullSamples != 0 )
		{
			//cull here
			float l;
			vec3 normHere = fNormal;
			vec2 texCoord = fCoord;
			if( uCullNormalMap )
			{
				CALC_WS_NORMAL;
			}
			vec3 refNormal = uRefNormal;
			float falloff = calcFalloff(refNormal, normHere);
			value *= falloff;
		}
	}
	vec4 selectionMask = texture2DLod( tTextureSelectionMask, fCoord, 0.0 );
	OUT_COLOR0 = saturate( value * selectionMask.x );
}
