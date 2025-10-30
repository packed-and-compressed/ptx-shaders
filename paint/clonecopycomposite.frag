#include "commonPaint.sh"
#include "../common/util.sh"
#include "data/shader/paint/layer/gbufferutils.sh"
#include "clonestamputils.sh"

USE_TEXTURE2D(tCopyCompositeTex);

uniform uint		uGBuffer;
uniform vec2		uGBufferScale;
uniform vec2		uFullDestTextureSize;

BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 texSpace = computeUnitModelUVs( fCoord, uModelUVRangeNoComp );

	if( texSpace.x<0.f || texSpace.x>1.f || texSpace.y<0.f || texSpace.y>1.f )
	{ 
		OUT_COLOR0 = vec4(0,0,0,0); 
		return;
	}

	float w = uFullDestTextureSize.x;
	float h = uFullDestTextureSize.y;

	vec2 pixelPos = fract(fCoord.xy) * vec2(w, h);
	vec2 pixelPosNearestF = clamp( pixelPos, vec2(0.f, 0.f), vec2(max(w - 1.f,0.f), max(h - 1.f,0.f)) );
	uint2 pixelPosNearestI = uint2( pixelPosNearestF );
	OUT_COLOR0 = imageLoad( tCopyCompositeTex, pixelPosNearestI );
}
