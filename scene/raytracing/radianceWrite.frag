#include "buffers.comp"

#ifdef RT_RADIANCE_TEXTURE
	USE_TEXTURE2DARRAY(tRadiance);
#else
	USE_BUFFER(uint2,bRadiance);
	uniform uint2 uRadianceStride;
#endif

uniform uint2 uRadianceChannels; //{output, alpha}
uniform float uRadianceSampleWeight;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	ushort2 outputCoord = ushort2( IN_POSITION.xy );
	uint outputChannel  = uRadianceChannels.x;
	uint alphaChannel   = uRadianceChannels.y;

#ifdef RT_RADIANCE_TEXTURE
	half4 radiance = half4( imageLoadArray( tRadiance, outputCoord, outputChannel ) );
	if( alphaChannel != outputChannel )
	{
		radiance.a = half( imageLoadArray( tRadiance, outputCoord, alphaChannel ).a );
	}
#else
	uint  offset   = outputChannel * uRadianceStride.x + outputCoord.y * uRadianceStride.y + outputCoord.x;
	half4 radiance = unpackVec4h( bRadiance[offset] );
	if( alphaChannel != outputChannel )
	{
		offset     = alphaChannel * uRadianceStride.x + outputCoord.y * uRadianceStride.y + outputCoord.x;
		radiance.a = unpackVec4h( bRadiance[offset] ).a;
	}
#endif

#ifdef RT_SANITIZE_RADIANCE
	//ensure accumulated radiance is non-negative and at most largest half-float normal number
	//filters out any NaNs and +Infs that might have crept in
	radiance = clamp( radiance, half(0), half(65504) );
#endif
	OUT_COLOR0 = vec4(radiance * uRadianceSampleWeight);
}
