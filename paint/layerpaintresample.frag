///////////////////////////
//basic resampler with no layer compositing

USE_TEXTURE2D( tTextureOriginalSrc );

uniform int		uFlipVertical;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	if( uFlipVertical != 0 )
	{ fCoord.y = 1.0f - fCoord.y; }
	OUT_COLOR0 = texture2DLod( tTextureOriginalSrc, fCoord, 0.0 );
}
