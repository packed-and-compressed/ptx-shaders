#ifndef MSET_V2_TEXTURE_FRAG
#define MSET_V2_TEXTURE_FRAG

#include "data/shader/common/udim.sh"
#include "data/shader/common/globalTextures.sh"

#define TEXTURE_FLAG_UDIM_MODE  0x80000000
#define TEXTURE_FLAG_GRAYSCALE  0x40000000
#define TEXTURE_FLAG_CHANNEL    0x60000000
#define TEXTURE_FLAG_MASK       0xF8000000

USE_BUFFER(uint, bTileDescs);
USE_SAMPLER(sMaterialSampler);

// ----------------------------------------------------------------------------

#if defined(MATERIAL_TEXTURE_UNIFORM) && \
   !defined(MATERIAL_TEXTURE_MODE_UDIM) //UDIMs can make resource indices diverge across lanes when shading the same material
	#define resourceByIndexDelegate resourceByUniformIndex
#else
	#define resourceByIndexDelegate resourceByIndex
#endif

// ----------------------------------------------------------------------------

#ifdef MATERIAL_TEXTURE_MODE_UDIM
void	textureMaterialResolveUDIM( inout uint index, vec4 coord )
{
	uint offset = (index & 0x0000FFFF);
	uint shape  = (index & 0x00FF0000) >> 16;
	uint rows   =  shape / 10;
	uint cols   = (shape % 10) + 1;
	
	uint tileOffset;
	if( calculateUDIMArrayOffset( coord.xy, rows, cols, tileOffset ) )
	{
		//fetch this tile texture index
		index = bTileDescs[offset + tileOffset];
	}
	else
	{
		//tile out of range; set invalid texture index so that sampling falls back to default color
		index = 0;
	}
}

void	textureMaterialResolveUDIM( inout uint index, SampleCoord coord )
{
	textureMaterialResolveUDIM( index, coord.uvCoord );
}
#endif

// ----------------------------------------------------------------------------

vec4    textureMaterialSample( uint index, vec4 texCoord )
{
	#ifdef SHADER_COMPUTE
		#ifdef MATERIAL_TEXTURE_GRADS
			return textureWithSamplerGrad( resourceByIndexDelegate(tGlobalTextures,index),
										   sMaterialSampler,
										   texCoord.xy,
										   unpackTextureGrad(texCoord.z),
										   unpackTextureGrad(texCoord.w) );
		#else
			return textureWithSamplerLod( resourceByIndexDelegate(tGlobalTextures,index),
										  sMaterialSampler,
										  texCoord.xy,
										  0.0 );
		#endif
	#else
		#ifdef MATERIAL_TEXTURE_NOMIPS
			return textureWithSamplerLod(	resourceByIndexDelegate(tGlobalTextures,index),
											sMaterialSampler,
											texCoord.xy, 0.0	);
		#else
			return textureWithSampler(	resourceByIndexDelegate(tGlobalTextures,index),
										sMaterialSampler,
										texCoord.xy	);
		#endif
	#endif
}

vec4    textureMaterialSample( uint index, SampleCoord coord )
{
	#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
		#ifdef SHADER_COMPUTE
			#ifdef MATERIAL_TEXTURE_GRADS
				vec4 tapX = textureWithSamplerGrad( resourceByIndexDelegate(tGlobalTextures,index),
													sMaterialSampler,
													coord.projectorCoord.uvX.xy,
													unpackTextureGrad( coord.projectorCoord.uvX.z ),
													unpackTextureGrad( coord.projectorCoord.uvX.w ) );
				vec4 tapY = textureWithSamplerGrad( resourceByIndexDelegate(tGlobalTextures,index),
													sMaterialSampler,
													coord.projectorCoord.uvY.xy,
													unpackTextureGrad( coord.projectorCoord.uvY.z ),
													unpackTextureGrad( coord.projectorCoord.uvY.w ) );
				vec4 tapZ = textureWithSamplerGrad( resourceByIndexDelegate(tGlobalTextures,index),
													sMaterialSampler,
													coord.projectorCoord.uvZ.xy,
													unpackTextureGrad( coord.projectorCoord.uvZ.z ),
													unpackTextureGrad( coord.projectorCoord.uvZ.w ) );
			#else
				vec4 tapX = textureWithSamplerLod( resourceByIndexDelegate(tGlobalTextures,index),
												   sMaterialSampler,
												   coord.projectorCoord.uvX.xy,
												   0.0 );
				vec4 tapY = textureWithSamplerLod( resourceByIndexDelegate(tGlobalTextures,index),
												   sMaterialSampler,
												   coord.projectorCoord.uvY.xy,
												   0.0 );
				vec4 tapZ = textureWithSamplerLod( resourceByIndexDelegate(tGlobalTextures,index),
												   sMaterialSampler,
												   coord.projectorCoord.uvZ.xy,
												   0.0 );
			#endif
		#else
			vec4 tapX = textureWithSampler( resourceByIndexDelegate(tGlobalTextures,index), sMaterialSampler, coord.projectorCoord.uvX.xy );
			vec4 tapY = textureWithSampler( resourceByIndexDelegate(tGlobalTextures,index), sMaterialSampler, coord.projectorCoord.uvY.xy );
			vec4 tapZ = textureWithSampler( resourceByIndexDelegate(tGlobalTextures,index), sMaterialSampler, coord.projectorCoord.uvZ.xy );
		#endif
		
		return triplanarMix( coord.projectorCoord, tapX, tapY, tapZ );
	#else
		return textureMaterialSample( index, coord.uvCoord );
	#endif
}

// ----------------------------------------------------------------------------

template<typename TextureCoordType>
vec4    textureMaterial( uint index, TextureCoordType coord, vec4 defaultColor )
{
	const bool flagGrayscale = index & TEXTURE_FLAG_GRAYSCALE;
#ifdef MATERIAL_TEXTURE_MODE_UDIM
	const bool flagUDIM      = index & TEXTURE_FLAG_UDIM_MODE;
#endif
	index &= ~uint(TEXTURE_FLAG_MASK);
	
#ifdef MATERIAL_TEXTURE_MODE_UDIM
	if( flagUDIM )
	{
		textureMaterialResolveUDIM( index, coord );
	}
#endif
	
	vec4 color = defaultColor;
	if( index )
	{
		color = textureMaterialSample( index, coord );
		color = flagGrayscale ? vec4( color.rrr, defaultColor.a ) : color;
	}
	return color;
}

template<typename TextureCoordType>
float   textureMaterial( uint index, TextureCoordType coord, float defaultValue )
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
		textureMaterialResolveUDIM( index, coord );
	}
#endif

	float value = defaultValue;
	if( index )
	{
		vec4 color = textureMaterialSample( index, coord );
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

// ----------------------------------------------------------------------------

float   scaleAndBias( float value, uint scaleBias )
{
	return value * f16tof32(scaleBias) + f16tof32(scaleBias>>16);
}

vec2    scaleAndBias( vec2 value, uint scaleBias )
{
	return value * f16tof32(scaleBias) + f16tof32(scaleBias>>16);
}

// ----------------------------------------------------------------------------

#undef resourceByIndexDelegate

#endif
