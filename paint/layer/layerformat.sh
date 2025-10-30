#ifndef LAYER_FORMAT_SH
#define LAYER_FORMAT_SH

#include "layerbuffer.sh"
#include "../../common/colorspace.sh"

#define FORMAT_R	0
#define FORMAT_RG	1
#define FORMAT_RGBA 2

uniform int		uBackingFormat;
uniform int		uOutputFormat;
uniform float	usRGBToLinearLUT[256];

//compute shaders cannot use mipmaps....unless we figure out something clever.
#ifdef LAYER_COMPUTE
	#define sampleBackingBuffer( buffer, uv ) 			sampleBackingBufferLod( buffer, uv, 0 )
#else
	#define sampleBackingBuffer( buffer, uv )			formatBackingColor( uBackingFormat, textureWithSampler( buffer, uBufferSampler, uv ) )
#endif

#define sampleBackingBufferLod( buffer, uv, lod )		formatBackingColor( uBackingFormat, textureWithSamplerLod( buffer, uBufferSampler, uv, lod ) )

#ifdef LAYER_COMPUTE
	#define sampleBackingBufferRaw( buffer, uv )		sampleBackingBufferRawLod( buffer, uv, 0 )
#else
	#define sampleBackingBufferRaw( buffer, uv )		textureWithSampler( buffer, uBufferSampler, uv )
#endif
#define sampleBackingBufferRawLod( buffer, uv, lod )	textureWithSamplerLod( buffer, uBufferSampler, uv, lod )

//NOTE: These decoder functions may change in the future as d3d12 sample swizzling allows for better R and RG format support

// Decode a formatted buffer sample into a grayscale value (swizzled as .rrra)
// Needed in case someone passes an RGB image into a grayscale slot and expects something better than the red channel
vec4	decodeToGray( int bufferFormat, vec4 color )
{
	if( bufferFormat == FORMAT_RG ) 
	{ return color.rrrg; }
	color = color.rrra;
	return color;
}

// Decode a formatted buffer sample into RGBA color
// Needed in case someone passes a grayscale image to a slot expecting RGB but red shows up
vec4	decodeToRGBA( int bufferFormat, vec4 color )
{
	if( bufferFormat == FORMAT_R )
	{
		color.rgb = color.rrr;
		color.a = 1.0;
	}
	else if( bufferFormat == FORMAT_RG ) 
	{ color = color.rrrg;  }
	return color;
}

// Decode a formatted buffer sample into a [-1,1] vector
// NOTE: does not handle grayscale
vec4	decodeToVector( vec4 scale, vec4 bias, vec4 color )
{ return (color*scale) + bias; }


//@@@ TODO: these cause an almost entirely avoidable mix(). They can be defined out for non-vector formats or at least precomputed into a scale/bias
uniform float	uInputLeftHandedNormals;
uniform float	uOutputLeftHandedNormals;

//NOTE: keep these up to date with FormatStage::convertColor
vec4	formatBackingColor( int inmode, vec4 color )
{
	/*
	//converts input format to RGBA color
	//R		0	.rrr1
	//RG 	1	.rrrg
	vec4 result = vec4(	color.r,
					(inmode < FORMAT_RGBA) ? color.r : color.g,
					(inmode < FORMAT_RGBA) ? color.r : color.b,
					(inmode == FORMAT_RG) ? color.g : color.a	);
	*/
	vec4 result = decodeToRGBA( inmode, color );
	result.y = mix( result.y, 1.0-result.y, uInputLeftHandedNormals );	//convert input TO right-handed normals
	return result;
}

vec4	formatOutputColor( int outmode, vec4 color )
{
	color.y = mix( color.y, 1.0-color.y, uOutputLeftHandedNormals );	//convert result FROM right-handed normals TO output

	//converts from RGBA color to selected output
	//R		.r***
	//RG 	.ra**
	color.g = (outmode == FORMAT_RG) ? color.a : color.g;	
	return color;
}

//same as formatOutput but converts prepass result back to input format for the next pass
vec4	formatOutputPrepass( vec4 color )
{
	color.y = mix( color.y, 1.0-color.y, uInputLeftHandedNormals );		//convert result FROM right-handed normals TO input format again

	//converts from RGBA color to selected output
	//R		.r***
	//RG 	.ra**
	color.g = (uBackingFormat == FORMAT_RG) ? color.a : color.g;	
	return color;
}

// gamma-corrected one_minus_color function for inverting sRGB colors in the proper space
vec3	invertColorFormatted( vec3 c )
{
	#if defined(LAYER_OUTPUT_SRGB) || defined(LAYER_EMULATE_SRGB)
		c.rgb = linearTosRGB(c.rgb);
	#endif

	c = vec3(1.0,1.0,1.0) - c;
	#if defined(LAYER_OUTPUT_SRGB) || defined(LAYER_EMULATE_SRGB)
		c.rgb = sRGBToLinear(c.rgb);
	#endif
	return c;
}


#endif

