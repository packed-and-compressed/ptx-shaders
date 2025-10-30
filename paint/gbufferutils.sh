#ifndef _GBUFFER_UTILS_SH
#define _GBUFFER_UTILS_SH

#include "data/shader/common/octpack.sh"

// Input -> packed RGB16 vec3 pixels
// Output -> normalized normal and tangent vectors
void unpackNormalTangent( in vec3 packedPixels, out vec3 unpackedNormal, out vec3 unpackedTangent )
{
	uint r =  uint( packedPixels.r * 0xFFFF );
	uint g =  uint( packedPixels.g * 0xFFFF );
	uint b =  uint( packedPixels.b * 0xFFFF );
	uint packedNormal = ( r << 8 ) + ( g >> 8 );
	uint packedTangent = ( ( g & 0xFF ) << 16 ) + b; 
	unpackedNormal = unpackUnitVectorOct24bit( packedNormal );
	unpackedTangent = unpackUnitVectorOct24bit( packedTangent );
}

// Input -> normalized normal and tangent vectors
// Output -> packed RGB16 vec3
vec3 packNormalTangent( in vec3 normal, in vec3 tangent )
{
	uint packedNormal = packUnitVectorOct24bit( normal );  // each channel is 12 bits
	uint packedTangnt = packUnitVectorOct24bit( tangent );

	uint r = packedNormal >> 8; // keep the high 16 bits
	uint g = ( ( packedNormal & 0xFF ) << 8 ) + ( packedTangnt >> 16 ); // keep the low 8 bits of normal and the high 8 bit of tangent
	uint b = packedTangnt & 0xFFFF; // keep the lowest 16 bits of the packed tangent

	return vec3( r, g, b ) / 0xFFFF;
}

#endif // _GBUFFER_UTILS_SH