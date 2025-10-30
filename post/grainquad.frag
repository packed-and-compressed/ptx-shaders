// Shader Params
USE_TEXTURE2D( tDirtSprite );

BEGIN_PARAMS
INPUT0( vec2, fSpriteCoord )
INPUT1( float, Opacity )

OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	// f(a, b) =
	// {
	//		2ab,				if a < 0.5
	//		1-2(1-a)(1-b),		otherwise
	// }
	// { 
	//		2ab,				if a < 0.5
	//		-1 + 2a + 2b(1-a),	otherwise
	//		reformulate
	//		a(2-1/a) + 2b(1-a),	otherwise
	// }

	// Fdst = src.a
	// Blend equation: a * ONE + b * Fdst
	float src = texture2D( tDirtSprite, fSpriteCoord ).r;
	int isrc = int(floor(src >= 1.0 ? 255 : src * 256.0));
	if (isrc == 127 || isrc == 128)
	{
		discard;
	}

	src = lerp(0.5f, src, Opacity);

	if (src < 0.5f)
	{
		OUT_COLOR0.rgb = float3(0, 0, 0);
		OUT_COLOR0.a = 2.0f * src;
	}
	else
	{
		OUT_COLOR0.rgb = src * ( 2.0f - 1.0f / src );
		OUT_COLOR0.a = 2.0f * ( 1.0f - src );
	}
}
