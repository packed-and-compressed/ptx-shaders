USE_TEXTURE2D(tIndirectMask);
USE_TEXTURE2D(tIndirectColor);

BEGIN_PARAMS
    INPUT0(vec2,fCoord)
    OUTPUT_COLOR0(vec4)
END_PARAMS
{
	#ifdef RENDERTARGET_Y_DOWN
		vec2 screenCoord = vec2( 0.5,-0.5 ) * fCoord + vec2( 0.5, 0.5 );
	#else
		vec2 screenCoord = vec2( 0.5, 0.5 ) * fCoord + vec2( 0.5, 0.5 );
	#endif

	vec3  color = texture2DLod( tIndirectColor, screenCoord, 0 ).rgb;
    float mask  = texture2DLod( tIndirectMask, screenCoord, 0 ).y;
    OUT_COLOR0  = vec4( color * mask, mask );
}
