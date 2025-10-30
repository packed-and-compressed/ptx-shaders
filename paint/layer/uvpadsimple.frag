
USE_TEXTURE2D_NOSAMPLER( tUVLUT );
USE_TEXTURE2D_NOSAMPLER( tTexture );
USE_SAMPLER( smpNearest );

BEGIN_PARAMS
	INPUT0( vec2, fTexCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 uv = textureWithSampler( tUVLUT, smpNearest, fTexCoord ).xy;
	OUT_COLOR0 = textureWithSampler( tTexture, smpNearest, uv );
}
