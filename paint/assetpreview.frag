USE_TEXTURE2D(tChannelR);
USE_TEXTURE2D(tChannelG);
USE_TEXTURE2D(tChannelB);
USE_TEXTURE2D(tChannelA);

uniform int uSwizzleRGBA;
uniform int uSwizzleRGB;
uniform int uSwizzleAlpha;

BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec4 R = texture2D( tChannelR, fBufferCoord );
	vec4 G = texture2D( tChannelG, fBufferCoord );
	vec4 B = texture2D( tChannelB, fBufferCoord );
	vec4 A = texture2D( tChannelA, fBufferCoord );

	vec4 result;
	if( uSwizzleRGBA > 0 )
	{
		result.r = R.x;
		result.g = G.y;
		result.b = B.z;	
		result.a = A.w;	
	}
	else if( uSwizzleRGB > 0 )
	{
		result.r = R.x;
		result.g = G.y;
		result.b = B.z;	
		result.a = A.x;
	}
	else
	{
		result.r = R.x;
		result.g = G.x;
		result.b = B.x;
		result.a = A.x;
	}
	
	if( uSwizzleAlpha > 0 )
	{
		result.rgb = fBufferCoord.x <= fBufferCoord.y ? result.rgb : result.aaa;
	}
	result.a = 1.0;

	OUT_COLOR0 = result;
}

