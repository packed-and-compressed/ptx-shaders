#include "gaussian.sh"
#include "layernoise.sh"

#define BINDLESS
#include "skirtPadding.sh"
#include "scattermask.sh"

uniform uint	uTextures[UDIM_MAX_TILES_IN_SHAPE];

uniform vec2	uSampleOffset;
uniform vec2	uPixelSize;
uniform vec2	uUDIMTile;

uniform int		uPaddingNormalMap;
uniform int		uFilterHemPixels;
uniform int		uFilterTouchingHemPixels;

USE_SAMPLER( sSampler );
USE_RAWBUFFER( bAverageColor );

bool isHemPixel( uint2 coord, uint arrayOffset )
{
	if( uFilterHemPixels == 0 )
	{ return false; }

	vec4 tap = vec4( 0.0, 0.0, 0.0, 0.0 );
	if( uGBufferFlags[arrayOffset] )
	{
		tap = imageLoad( resourceByIndex( tGlobalTextures, uGBufferFlags[arrayOffset] ), coord );
	}
	int flags = int( ceil( tap.x * 255.0 ) );
	return flags & GBUFFER_FLAGS_HEM_PIXEL;
}

bool isHem( int2 pixel, int offX, int offY, uint arrayOffset  )
{
	int2 offset = int2(offX, offY);
	//check if the pixel is valid and has data on it.

	int w = uGBufferMapSizes[arrayOffset * 2 + 0];
	int h = uGBufferMapSizes[arrayOffset * 2 + 1];
	int2 ip = pixel + offset;
	if(ip.x < 0 )
	{ ip.x += w; }
	if(ip.x >= w )
	{ ip.x -= w; }
	if(ip.y < 0 )
	{ ip.y += h; }
	if(ip.y >= h )
	{ ip.y -= h; }
	uint2 p = uint2(ip);
	return isHemPixel( p, arrayOffset );
}

bool touchesHem( int2 here, uint arrayOffset )
{
	if( uFilterTouchingHemPixels == 0 )
	{ return false; }
	return isHem( here, -1, -1, arrayOffset ) ||
		 isHem( here, 0, -1, arrayOffset ) ||
		 isHem( here, 1, -1, arrayOffset ) ||
		 isHem( here, -1, 0, arrayOffset ) ||
		 isHem( here, 1, 0, arrayOffset ) ||
		 isHem( here, -1, 1, arrayOffset ) ||
		 isHem( here, 0, 1, arrayOffset ) ||
		 isHem( here, 1, 1, arrayOffset );
}

bool testPaddedUV( vec2 sampleCoord, int originGroup )
{
	uint arrayOffset = getBufferAddress( sampleCoord );
	if( arrayOffset == ~0u )
	{ return false; }

	uint w = uGBufferMapSizes[arrayOffset * 2 + 0];
	uint h = uGBufferMapSizes[arrayOffset * 2 + 1];

	vec2 gBufferCoord = frac( sampleCoord );
	#ifdef RENDERTARGET_Y_DOWN
		gBufferCoord.y = 1.0 - gBufferCoord.y;
	#endif

	uint2 loadCoord = uint2( gBufferCoord * vec2( w, h ) );
	if( isHemPixel( loadCoord, arrayOffset ) )
	{ return false; }
	if( touchesHem( int2( loadCoord ), arrayOffset ) )
	{ return false; }
	PaddedPixelDesc pixelDesc = getPaddedPixelDesc( sampleCoord );
	return originGroup == pixelDesc.groupIndex;
}

uint getScatterHVFlags( vec2 sampleCoord, int originGroup, vec2 H, vec2 V )
{
	vec2 sampleOffset = uSampleOffset;
	bool a = testPaddedUV(sampleCoord+(-sampleOffset.y*V), originGroup);
	bool b = testPaddedUV(sampleCoord+(-sampleOffset.x*H), originGroup);
	bool c = testPaddedUV(sampleCoord+(sampleOffset.x*H), originGroup);
	bool d = testPaddedUV(sampleCoord+(sampleOffset.y*V), originGroup);
	uint result = 0;
	if( a ) result = useSampleTop;
	if( b ) result = result | useSampleLeft;
	if( c ) result = result | useSampleRight;
	if( d ) result = result | useSampleBottom;
	return result;
}

uint getScatterDiagFlags( vec2 sampleCoord, int originGroup, vec2 H, vec2 V )
{
	vec2 sampleOffset = uSampleOffset;
	bool a = testPaddedUV(sampleCoord+(-sampleOffset.x*H)+(-sampleOffset.y*V), originGroup);
	bool b = testPaddedUV(sampleCoord+( sampleOffset.x*H)+(-sampleOffset.y*V), originGroup);
	bool c = testPaddedUV(sampleCoord+(-sampleOffset.x*H)+(sampleOffset.y*V), originGroup);
	bool d = testPaddedUV(sampleCoord+( sampleOffset.x*H)+(sampleOffset.y*V), originGroup);
	uint result = 0;
	if( a ) result = useSampleUL;
	if( b ) result = result | useSampleUR;
	if( c ) result = result | useSampleLL;
	if( d ) result = result | useSampleLR;
	return result;
}

uint getScatterFlags( vec2 sampleCoord, vec2 H, vec2 V )
{
	PaddedPixelDesc pixelDesc = getPaddedPixelDesc( sampleCoord );
	if( pixelDesc.mapIndex != 0 )
	{
		return getScatterHVFlags( sampleCoord, pixelDesc.groupIndex, H, V ) | getScatterDiagFlags( sampleCoord, pixelDesc.groupIndex, H, V );
	}
	return 0;
}


ScatterSampler getScatterSampler( PaddedPixelDesc pixelDesc, vec2 uv, bool teleport )
{
	ScatterSampler ss;
	if( teleport )
	{ ss.uv = pixelDesc.sampleUV; }
	else
	{ ss.uv = uv; }
	ss.directionV = vec2(0,1);
	ss.scatterFlags = 0;

	if( pixelDesc.mapIndex == 0 )//dead pixel
	{ return ss; }

	if( teleport )
	{
		ss.directionV =	radiansToUnitVec2( -pixelDesc.skirtRotation );
	}
	vec2 V = ss.directionV;
	vec2 H = vec2(-V.y, V.x);
	ss.scatterFlags = getScatterFlags( ss.uv, H, V );

	if( teleport && ss.scatterFlags == 0 )//remote position has no matching samples
	{
		ss.uv = uv;
		ss.directionV = vec2(0,1);
		V = ss.directionV;
		H = vec2(-V.y, V.x);
		ss.scatterFlags = getScatterFlags( ss.uv, H, V );
	}

	return ss;
}

vec4 getBGColor()
{
	vec4 result;
	result.r = float( rawLoad( bAverageColor, 0 ) ) / 0xFF;
	result.g = float( rawLoad( bAverageColor, 1 ) ) / 0xFF;
	result.b = float( rawLoad( bAverageColor, 2 ) ) / 0xFF;
	float count = float( rawLoad( bAverageColor, 3 ) );
	result.rgb /= count;
	result.a = 1.0;
	return result;
}

BEGIN_PARAMS
INPUT0(vec2, fBufferCoord)
OUTPUT_COLOR0( vec4 )//padded src
OUTPUT_COLOR1( vec4 )//scatterMask (uvredirect(32), rotation(16), scattermask(8), extramisc(8))
END_PARAMS
{
	vec2 sampleCoord = fBufferCoord + uUDIMTile;

	PaddedPixelDesc pixelDesc = getPaddedPixelDesc( sampleCoord );

	uint remoteBufferAddress = getBufferAddress( pixelDesc.sampleUV );
	bool teleport = (pixelDesc.mapIndex < 0) && remoteBufferAddress != ~0u && uTextures[remoteBufferAddress] != 0;
	ScatterSampler ss = getScatterSampler( pixelDesc, sampleCoord, teleport );
	vec2 padSrcUV = teleport ? pixelDesc.sampleUV : sampleCoord;

	uint arrayOffset = getBufferAddress( padSrcUV );
	vec4 padSample = vec4( 0.0, 0.0, 0.0, 0.0 );
	if( arrayOffset != ~0u && uTextures[arrayOffset] )
	{
		padSample = textureWithSamplerLod( resourceByIndex( tGlobalTextures, uTextures[arrayOffset] ), sSampler, frac( padSrcUV ), 0.0 );
	}

	if( uPaddingNormalMap != 0 && ss.directionV.y != 0 )
	{
		vec2 V = ss.directionV;
		vec2 H = vec2(-V.y, V.x);
		padSample.xy = convertNormalMapXY( padSample.xy, H, V );
	}
	if( pixelDesc.mapIndex == 0 )
	{
		padSample = getBGColor();
	}
	OUT_COLOR0 = padSample;
	OUT_COLOR1 = packScatterSampler(ss);
}

