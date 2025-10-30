#include "gaussian.sh"
#include "layernoise.sh"
#include "../../common/rng.comp"

#ifdef PREPASS
	#include "layerbuffer.sh"
	#include "layerformat.sh"
#else
	#include "layer.sh"	
#endif

USE_TEXTURE2D( tTexture );

uniform int2	uBufferSize;
uniform int		uRandomSeedValue;

uniform vec2	uSampleOffset;
uniform int		uSampleMode;

#include "paddedSampling.sh"
#include "scattermask.sh"


void accumScatterSample( vec2 uv, inout vec4 result )
{
	result += getTexSamplePremult( uv );
}


vec4 getBlurSample( vec2 uv, vec4 extents )
{
	vec4 outputColor = vec4(0.0, 0.0, 0.0, 0.0);
	vec2 V = vec2(0,1);
	vec2 H = vec2(-V.y, V.x);

#ifdef PREPASS
	if( uSampleMode < 2 )
	{
		accumScatterSample( uv+( -uSampleOffset.y*V*extents.x ), outputColor );
		accumScatterSample( uv+(-uSampleOffset.x*H*extents.y ), outputColor );
		accumScatterSample( uv+( uSampleOffset.x*H*extents.z ), outputColor );
		accumScatterSample( uv+( uSampleOffset.y*V*extents.w ), outputColor );
	}// == HV only
	else
	{
		accumScatterSample( uv+(((-uSampleOffset.x*H)+(-uSampleOffset.y*V))*extents.x), outputColor );
		accumScatterSample( uv+((( uSampleOffset.x*H)+(-uSampleOffset.y*V ))*extents.y), outputColor );
		accumScatterSample( uv+(((-uSampleOffset.x*H)+( uSampleOffset.y*V ))*extents.z), outputColor );
		accumScatterSample( uv+((( uSampleOffset.x*H)+(uSampleOffset.y*V ))*extents.w), outputColor );
	}// == diags only
	outputColor *= 0.25f;
#else
	accumScatterSample( uv+(((-uSampleOffset.x*H)+(-uSampleOffset.y*V))*0.70710678118f), outputColor );
	accumScatterSample( uv+((( uSampleOffset.x*H)+(-uSampleOffset.y*V ))*0.70710678118f), outputColor );
	accumScatterSample( uv+(((-uSampleOffset.x*H)+( uSampleOffset.y*V ))*0.70710678118f), outputColor );
	accumScatterSample( uv+((( uSampleOffset.x*H)+(uSampleOffset.y*V ))*0.70710678118f), outputColor );
	accumScatterSample( uv+( -uSampleOffset.y*V ), outputColor );
	accumScatterSample( uv+(-uSampleOffset.x*H ), outputColor );
	accumScatterSample( uv+( uSampleOffset.x*H ), outputColor );
	accumScatterSample( uv+( uSampleOffset.y*V ), outputColor );
	outputColor *= 0.125f;
#endif

	outputColor.rgb = saturate( outputColor.rgb / max( 0.0001, outputColor.a ) );
	return outputColor;
}


BEGIN_PARAMS
INPUT0(vec2, fBufferCoord)
OUTPUT_COLOR0( vec4 )
END_PARAMS
{

	vec4 randomExtents = vec4(1,1,1,1);
	RNG randomNumber = rngInit( ushort2( IN_POSITION.xy ), uRandomSeedValue );
	randomExtents.x = rngNextFloat( randomNumber );
	randomExtents.y = rngNextFloat( randomNumber );
	randomExtents.z = rngNextFloat( randomNumber );
	randomExtents.w = rngNextFloat( randomNumber );

	vec4 outputColor = getBlurSample( fBufferCoord, randomExtents );

	#ifdef PREPASS
		OUT_COLOR0 = formatOutputPrepass( outputColor ); // prepass isn't actually a layer shader and needs to end up back in uBackingFormat
	#else
		LayerState state = getLayerState( fBufferCoord );
		state.result = outputColor;
		state.result = compositeLayerState( state );
		OUT_COLOR0 = state.result; 
	#endif
}

