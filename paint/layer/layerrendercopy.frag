#include "layerbuffer.sh"
#include "layerformat.sh"
#include "layernoise.sh"
	
uniform vec2 uTexCoordOffset;

#ifdef USE_SOLID_COLOR
	uniform vec4 uColor;
#else
	USE_LAYER_BUFFER2D(tTexture);
#endif

#ifdef USE_CLIPMASK
	USE_LAYER_BUFFER2D(tMask);
#endif

BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
#ifdef USE_TEXOFFSET
	vec2 tc = uTexCoordOffset;
#else
	vec2 tc = fBufferCoord;
#endif

#ifdef USE_CLIPMASK		
	if( sampleBackingBufferRawLod( tMask, tc, 0.0 ).g < 0.001 ) discard;
#endif

#ifndef USE_TEXOFFSET
	tc += uTexCoordOffset;
#endif

#ifdef USE_SOLID_COLOR
	vec4 result = uColor;
#else
	vec4 result = sampleBackingBufferRawLod( tTexture, tc, 0.0 );
#endif

	result = formatBackingColor( uBackingFormat, result );
	result = formatOutputColor( uOutputFormat, result );	
	
#ifdef COPY_OUTPUT_DITHER
	#ifdef COPY_OUTPUT_SRGB
	result.rgb = linearTosRGB( result.rgb );
	#endif

	result.rgb = layerDither8bit( result.rgb,  IN_POSITION.xy );
	
	#ifdef COPY_OUTPUT_SRGB
	result.rgb = sRGBToLinear(result.rgb);
	#endif
#endif

	OUT_COLOR0 = result;
}

