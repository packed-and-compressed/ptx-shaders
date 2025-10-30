#include "effect.frag"
#include "layer.sh"
#include "gbufferutils.sh"

uniform uint3		uColors[COLORS_COUNT];
uniform float4		uTexelSize;
uniform uint		uGBuffer;
uniform uint		uSkipMask;
uniform float		uSkipMaskValue;

USE_TEXTURE2D(tInputTextureColorIds);

bool areEqualsColorsI(int3 colorI1, int3 colorI2)
{
	int3 diff = colorI1 - colorI2;
	return !any(diff);
}

int3 getColorI(vec3 colorF)
{
	return int3( floor( colorF * 255.0 + vec3(0.5,0.5,0.5) ) );
}

bool isUserColor( vec2 sampleCoord )
{
	if( uGBuffer )
	{
		if( !isInUVIslandFromFCoords(sampleCoord) )
		{ return false; }
	}
	
	// Recenter texel in case resolution are different between input map and output buffer
	float2 recenterCoords = (floor(sampleCoord / uTexelSize.xy)+0.5) * uTexelSize.xy;
	vec3 inputIdColor = texture2DLod( tInputTextureColorIds, recenterCoords, 0.f ).xyz;

	int3 inputIdColorI = getColorI(inputIdColor);   

	for( int c=0; c<COLORS_COUNT; ++c )
	{
		if( areEqualsColorsI(inputIdColorI, int3( uColors[c].xyz ) ) )
		{
			return true;
		}
	}

	return false;
}

vec4 runEffect( LayerState state )
{
	if( uSkipMask>0 )
	{  return vec4( uSkipMaskValue, uSkipMaskValue, uSkipMaskValue, 1.0 ); }

	vec2 sampleCoord = state.bufferCoord;
	float value = 0.f;

	if( isUserColor(sampleCoord) )
	{ value = 1.f; }

	return vec4( value, value, value, 1.0 );
}

vec4 finalizeEffect( LayerState state, inout float _blendAmount )
{ return state.result; }

