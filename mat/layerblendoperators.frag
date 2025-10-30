#ifndef LAYER_BLEND_OPERATORS_FRAG
#define LAYER_BLEND_OPERATORS_FRAG

// ----------------------------------------------------------------
// Blend operators indices (need to agree with values in MaterialEnum.h)
// ----------------------------------------------------------------
#define MATERIAL_LAYER_BLENDING_MODE_DISABLED 0
#define MATERIAL_LAYER_BLENDING_MODE_STANDARD 1
#define MATERIAL_LAYER_BLENDING_MODE_ADD 2
#define MATERIAL_LAYER_BLENDING_MODE_MULTIPLY 3
#define MATERIAL_LAYER_BLENDING_MODE_OVERLAY 4
#define MATERIAL_LAYER_BLENDING_MODE_SCREEN 5
#define MATERIAL_LAYER_BLENDING_MODE_DARKEN 6
#define MATERIAL_LAYER_BLENDING_MODE_COLOR_DODGE 7
#define MATERIAL_LAYER_BLENDING_MODE_COLOR_BURN 8
#define MATERIAL_LAYER_BLENDING_MODE_LINEAR_BURN 9
#define MATERIAL_LAYER_BLENDING_MODE_MAX_ENUM 10

// ----------------------------------------------------------------
// Blend operators
// ----------------------------------------------------------------
template<typename T>
T DisabledBlendOperator( T source, T dest, T blendFactors )
{
    return dest;
}

template<typename T>
T AlphaBlendOperator( T source, T dest, T blendFactors )
{
    return mix( dest, source, blendFactors );
}

template<typename T>
T AddBlendOperator( T source, T dest, T blendFactors )
{
    return mix( dest, saturate( source + dest ), blendFactors );
}

template<typename T>
T MultiplyBlendOperator( T source, T dest, T blendFactors )
{
    return mix( dest, source * dest, blendFactors );
}

template<typename T>
T OverlayBlendOperator( T source, T dest, T blendFactors )
{
    T result = mix( 2.0 * source * dest,
                    mad( 1.0 - source, mad( 2.0, dest, -2.0 ), 1.0 ),
				    (T)greaterThanEqual( source, (T)0.5 ) );
    return mix( dest, result, blendFactors );
}

template<typename T>
T ScreenBlendOperator( T source, T dest, T blendFactors )
{
    T result = mad( source - 1.0, 1.0 - dest, 1.0 );
    return mix( dest, result, blendFactors );
}

template<typename T>
T DarkenBlendOperator( T source, T dest, T blendFactors )
{
    return mix( dest, min( source, dest ), blendFactors );
}

template<typename T>
T ColorDodgeBlendOperator( T source, T dest, T blendFactors )
{
    T result = dest * rcp( max( (T)0.0001, 1.0 - source ) );
    return mix( dest, result, blendFactors );
}

template<typename T>
T ColorBurnBlendOperator( T source, T dest, T blendFactors )
{
    T result = mad( dest - 1.0, rcp( max( (T)0.0001, source ) ), 1.0 );
    return mix( dest, result, blendFactors );
}

template<typename T>
T LinearBurnBlendOperator( T source, T dest, T blendFactors )
{
    T result = saturate( source + dest - 1.0 );
    return mix( dest, result, blendFactors );
}

template<typename T>
T VectorAddBlendOperator( T source, T dest, T blendFactors )
{
    return mix( dest, source + dest, blendFactors );
}

vec3 VectorOverlayBlendOperator( vec3 source, vec3 dest, vec3 blendFactors, vec3 N )
{	
    vec3 result =
		( dest - N ) +
		( source - N ) +
		N;
    result = mix( dest, result, blendFactors );
    
    // This ajusts the result so that it is in the same hemisphere as N. This is done by calcluating the
    // interpolation factor between N and the result, such that the mix is about 0.5 degrees inside the
    // hemisphere.
    float d = dot( result, N );
    if( d < 0 )
    {
        const float OneMinusCos89Point5Degrees = 0.9912734645;
        result = normalize( mix( N, result, OneMinusCos89Point5Degrees / ( 1.0 - d ) ) );
    }
    
    return result;
}

template<typename T>
T VectorLinearBurnBlendOperator( T source, T dest, T blendFactors )
{
    T result = source + dest - 1.0;
    return mix( dest, result, blendFactors );
}

#endif  // LAYER_BLEND_OPERATORS_FRAG
