float   ParallaxTextureSampleLod( uint index, vec2 coord, float lod, float defaultValue )
{
	const bool flagGrayscale = index & TEXTURE_FLAG_GRAYSCALE;
	#ifdef MATERIAL_TEXTURE_MODE_UDIM
		const bool flagUDIM      = index & TEXTURE_FLAG_UDIM_MODE;
	#endif
	const uint channel 		 = (index & TEXTURE_FLAG_CHANNEL) >> uint(29);
	index &= ~uint(TEXTURE_FLAG_MASK);
	
	#ifdef MATERIAL_TEXTURE_MODE_UDIM
		if( flagUDIM )
		{
			textureMaterialResolveUDIM( index, vec4( coord, 0, 0 ) );
		}
	#endif

	float value = defaultValue;
	if( index )
	{
		#if defined(MATERIAL_TEXTURE_UNIFORM) && \
			!defined(MATERIAL_TEXTURE_MODE_UDIM) //UDIMs can make resource indices diverge across lanes when shading the same material
			vec4 color = textureWithSamplerLod( resourceByUniformIndex(tGlobalTextures, index),
												sMaterialSampler,
												coord.xy,
												lod );
		#else
			vec4 color = textureWithSamplerLod( resourceByIndex(tGlobalTextures, index),
												sMaterialSampler,
												coord.xy,
												lod );
		#endif
		switch( channel )
		{
		case 0: value = color.r; break;
		case 1: value = color.g; break;
		case 2: value = color.b; break;
		case 3: value = color.a; break;
		}
	}
	return value;
}

struct DisplacementParallaxMapParams
{
    uint heightTexture;
    uint depthOffset;
    uint quality;
    packed_vec2 brightnessContrastScaleBias;
};

#define DisplacementParams			DisplacementParallaxMapParams
