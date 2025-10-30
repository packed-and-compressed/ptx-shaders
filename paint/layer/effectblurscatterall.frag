#include "gaussian.sh"
#include "layernoise.sh"
#include "../../common/rng.comp"


#ifdef PREPASS
	#include "layerbuffer.sh"
	#include "layerformat.sh"
#else
	#include "layer.sh"	
#endif

#include "data/shader/common/udim.sh"
#include "data/shader/common/globalTextures.sh"

USE_SAMPLER( sSampler );
uniform uint	uTextures[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uTexturesSizes[UDIM_MAX_TILES_IN_SHAPE * 2];

uniform uint	uScatterMasks[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uScatterMasksSizes[UDIM_MAX_TILES_IN_SHAPE * 2];

uniform int2	uShape;
uniform vec2	uUDIMTile;

uniform int2	uBufferSize;
uniform int		uRandomSeedValue;

uniform vec2	uSampleOffset;
uniform int		uSampleMode;

#include "scattermask.sh"

uint getArrayOffset( vec2 texCoord )
{
	uint arrayOffset;
	if( calculateUDIMArrayOffset( texCoord.xy, uShape.x, uShape.y, arrayOffset ) )
	{ return arrayOffset; }
	return ~0u; // return a nullptr if it's not a valid array offset
}

vec4 sampleTexture( vec2 uv )
{
	uint arrayOffset = getArrayOffset( uv );
	if( arrayOffset != ~0u && uTextures[arrayOffset] != 0 )
	{
		return formatBackingColor( uBackingFormat, textureWithSamplerLod( resourceByIndex( tGlobalTextures, uTextures[arrayOffset] ), sSampler, frac( uv ), 0.0 ) );
	}
	return vec4( 0.0, 0.0, 0.0, 0.0 );
}

void accumScatterSample( vec2 uv, inout vec4 result )
{
	vec4 tap = sampleTexture( uv );
	tap.rgb *= tap.a;
	result += tap;
}

bool getScatterSampler( vec2 uv, out ScatterSampler ss )
{
	uint arrayOffset = getArrayOffset( uv );
	if( arrayOffset != ~0u && uScatterMasks[arrayOffset] != 0 )
	{
		uint w = uScatterMasksSizes[arrayOffset * 2 + 0];
		uint h = uScatterMasksSizes[arrayOffset * 2 + 1];
		uint2 loadCoord = uint2( frac( uv ) * vec2( w, h ) );
		ss = unpackScatterSampler( imageLoad( resourceByIndex( tGlobalTextures, uScatterMasks[arrayOffset] ), loadCoord ) );
		return true;
	}
	return false;
}

vec4 getBlurSample( ScatterSampler ss, vec4 extents )
{
	vec4 outputColor = vec4(0.0, 0.0, 0.0, 0.0);
	vec2 V = ss.directionV;
	vec2 H = vec2(-V.y, V.x);

	int cnt = 0;

#ifdef PREPASS
	if( uSampleMode < 2 )
	{
		if( ss.scatterFlags & useSampleTop )
		{ accumScatterSample( ss.uv+( -uSampleOffset.y*V*extents.x ), outputColor );cnt++; }
		if( ss.scatterFlags & useSampleLeft )
		{ accumScatterSample( ss.uv+(-uSampleOffset.x*H*extents.y ), outputColor );cnt++; }
		if( ss.scatterFlags & useSampleRight )
		{ accumScatterSample( ss.uv+( uSampleOffset.x*H*extents.z ), outputColor );cnt++; }
		if( ss.scatterFlags & useSampleBottom )
		{ accumScatterSample( ss.uv+( uSampleOffset.y*V*extents.w ), outputColor );cnt++; }
	}// == HV only
	else
	{
		if( ss.scatterFlags & useSampleUL )
		{ accumScatterSample( ss.uv+(((-uSampleOffset.x*H)+(-uSampleOffset.y*V))*extents.x), outputColor );cnt++; }
		if( ss.scatterFlags & useSampleUR )
		{ accumScatterSample( ss.uv+((( uSampleOffset.x*H)+(-uSampleOffset.y*V ))*extents.y), outputColor );cnt++; }
		if( ss.scatterFlags & useSampleLL )
		{ accumScatterSample( ss.uv+(((-uSampleOffset.x*H)+( uSampleOffset.y*V ))*extents.z), outputColor );cnt++; }
		if( ss.scatterFlags & useSampleLR )
		{ accumScatterSample( ss.uv+((( uSampleOffset.x*H)+(uSampleOffset.y*V ))*extents.w), outputColor );cnt++; }
	}// == diags only
#else
	if( ss.scatterFlags & useSampleUL )
	{ accumScatterSample( ss.uv+(((-uSampleOffset.x*H)+(-uSampleOffset.y*V))*0.70710678118f), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleUR )
	{ accumScatterSample( ss.uv+((( uSampleOffset.x*H)+(-uSampleOffset.y*V ))*0.70710678118f), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleLL )
	{ accumScatterSample( ss.uv+(((-uSampleOffset.x*H)+( uSampleOffset.y*V ))*0.70710678118f), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleLR )
	{ accumScatterSample( ss.uv+((( uSampleOffset.x*H)+(uSampleOffset.y*V ))*0.70710678118f), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleTop )
	{ accumScatterSample( ss.uv+( -uSampleOffset.y*V ), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleLeft )
	{ accumScatterSample( ss.uv+(-uSampleOffset.x*H ), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleRight )
	{ accumScatterSample( ss.uv+( uSampleOffset.x*H ), outputColor );cnt++; }
	if( ss.scatterFlags & useSampleBottom )
	{ accumScatterSample( ss.uv+( uSampleOffset.y*V ), outputColor );cnt++; }
#endif

	if( cnt == 0 )
	{
		return  sampleTexture( ss.uv );
	}

	outputColor /= cnt;
	outputColor.rgb = saturate( outputColor.rgb / max( 0.0001, outputColor.a ) );
	return outputColor;
}

//red = no samples
//white = all samples
vec4 debugVisScatterCoverage( ScatterSampler ss )
{
	int cnt = 0;
	if( ss.scatterFlags & useSampleUL ) { cnt++; }
	if( ss.scatterFlags & useSampleUR ) { cnt++; }
	if( ss.scatterFlags & useSampleLL ) { cnt++; }
	if( ss.scatterFlags & useSampleLR ) { cnt++; }
	if( ss.scatterFlags & useSampleTop ) { cnt++; }
	if( ss.scatterFlags & useSampleLeft ) { cnt++; }
	if( ss.scatterFlags & useSampleRight ) { cnt++; }
	if( ss.scatterFlags & useSampleBottom ) { cnt++; }
	float v = ((float)cnt)/8;
	return vec4(1,v,v,1);
}

BEGIN_PARAMS
INPUT0(vec2, fBufferCoord)
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 sampleCoord = fBufferCoord;
	sampleCoord += uUDIMTile;

	ScatterSampler ss;
	if( !getScatterSampler( sampleCoord, ss ) )
	{ discard; } // not sure if the right call here but we'll see
	
	vec4 randomExtents = vec4(1,1,1,1);
	RNG randomNumber = rngInit( ushort2( IN_POSITION.xy + uUDIMTile * vec2( uBufferSize ) ), uRandomSeedValue );
	randomExtents.x = rngNextFloat( randomNumber );
	randomExtents.y = rngNextFloat( randomNumber );
	randomExtents.z = rngNextFloat( randomNumber );
	randomExtents.w = rngNextFloat( randomNumber );

	if( abs(ss.uv.x - sampleCoord.x) < uSampleOffset.x && abs(ss.uv.y - sampleCoord.y) < uSampleOffset.y )
	{ ss.uv = sampleCoord; }
	
#ifdef PREPASS
	// prepass isn't actually a layer shader and needs to end up back in uBackingFormat
	if( ss.scatterFlags != 0 )
	{ OUT_COLOR0 = formatOutputPrepass( getBlurSample( ss, randomExtents ) ); }
	else
#ifdef FILL_BACKGROUND
	{ OUT_COLOR0 = formatOutputPrepass( sampleTexture( sampleCoord ) ); }
#else
	{ discard; }
#endif

#else
	LayerState state = getLayerState( fBufferCoord );
	state.result = getBlurSample( ss, randomExtents );		
	state.result = compositeLayerState( state );
	OUT_COLOR0 = state.result; 
#endif

}

