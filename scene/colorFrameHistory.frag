USE_TEXTURE2D(tColor);

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//screen and NDC coordinates
	vec2 ndcCoord = fCoord;
	#ifdef RENDERTARGET_Y_DOWN
		vec2 screenCoord = vec2( 0.5,-0.5 ) * ndcCoord + vec2( 0.5, 0.5 );
	#else
		vec2 screenCoord = vec2( 0.5, 0.5 ) * ndcCoord + vec2( 0.5, 0.5 );
	#endif

	//color
	vec4 col = texture2DLod( tColor, screenCoord, 0.0 );

	OUT_COLOR0 = col;
}