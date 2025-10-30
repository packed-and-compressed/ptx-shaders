#ifndef LAYER_BLEND_FRAG
#define LAYER_BLEND_FRAG

#include "data/shader/common/colorspace.sh"
#include "data/shader/mat/layerBlendOperators.frag"

// ----------------------------------------------------------------
// Helper
// ----------------------------------------------------------------

#define BASE_LAYER_INDEX 0

// ----------------------------------------------------------------
// Subroutine slots (need to agree with values in MaterialEnum.h)
// ----------------------------------------------------------------
#define SUBROUTINE_DISPLACEMENT_BLEND 0
#define SUBROUTINE_SURFACE_BLEND 1
#define SUBROUTINE_ALBEDO_BLEND 2
#define SUBROUTINE_DIFFUSION_BLEND 3
#define SUBROUTINE_TRANSMISSION_BLEND 4
#define SUBROUTINE_REFLECTION_BLEND 5
#define SUBROUTINE_MICROSURFACE_BLEND 6
#define SUBROUTINE_REFLECTIVITY_BLEND 7
#define SUBROUTINE_CLEARCOAT_REFLECTION_BLEND 8
#define SUBROUTINE_CLEARCOAT_MICROSURFACE_BLEND 9
#define SUBROUTINE_CLEARCOAT_REFLECTIVITY_BLEND 10
#define SUBROUTINE_EMISSION_BLEND 11
#define SUBROUTINE_OCCLUSION_BLEND 12
#define SUBROUTINE_TRANSPARENCY_BLEND 13
#define SUBROUTINE_TEXTURE_BLEND 14
#define SUBROUTINE_MERGE_BLEND 15

#define SUBROUTINE_BLEND_MAX_ENUM 16

// ----------------------------------------------------------------
// Field blending method
// ----------------------------------------------------------------
template<typename T>
T BlendUsingOperator( uint blendOperator, T source, in T dest, float blendingCoefficient )
{   
    T blendingCoefficients = (T)blendingCoefficient;
    switch( blendOperator )
    {
        default:
        case MATERIAL_LAYER_BLENDING_MODE_DISABLED:
            return DisabledBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_STANDARD:
            return AlphaBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_ADD:
            return AddBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_MULTIPLY:
            return MultiplyBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_OVERLAY:
            return OverlayBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_SCREEN:
            return ScreenBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_DARKEN:
            return DarkenBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_COLOR_DODGE:
            return ColorDodgeBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_COLOR_BURN:
            return ColorBurnBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_LINEAR_BURN:
            return LinearBurnBlendOperator( source, dest, blendingCoefficients );
    }
}

// ----------------------------------------------------------------
// Vector blending method
// ----------------------------------------------------------------
template<typename T>
T BlendVectorUsingOperator( uint blendOperator, T source, in T dest, float blendingCoefficient, in vec3 normal )
{
    T blendingCoefficients = (T)blendingCoefficient;
    switch( blendOperator )
    {
        default:
        case MATERIAL_LAYER_BLENDING_MODE_DISABLED:
            return DisabledBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_STANDARD:
            return AlphaBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_ADD:
            return VectorAddBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_MULTIPLY:
            return MultiplyBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_OVERLAY:
            return VectorOverlayBlendOperator( source, dest, blendingCoefficients, normal );
        case MATERIAL_LAYER_BLENDING_MODE_SCREEN:
            return ScreenBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_DARKEN:
            return DarkenBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_COLOR_DODGE:
            return ColorDodgeBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_COLOR_BURN:
            return ColorBurnBlendOperator( source, dest, blendingCoefficients );
        case MATERIAL_LAYER_BLENDING_MODE_LINEAR_BURN:
            return VectorLinearBurnBlendOperator( source, dest, blendingCoefficients );
    }
}

// ----------------------------------------------------------------
// Blending entry points
// ----------------------------------------------------------------
template<typename T>
T BlendField( uint blendOperator, T source, in T dest, float blendingCoefficient )
{
    return BlendUsingOperator( blendOperator, source, dest, blendingCoefficient );
}

template<typename T>
T BlendVector( uint blendOperator, T source, in T dest, float blendingCoefficient, in vec3 normal )
{
    return BlendVectorUsingOperator( blendOperator, source, dest, blendingCoefficient, normal );
}

template<typename T>
T BlendFieldViasRBG( uint blendOperator, T source, in T dest, float blendingCoefficient )
{   
    T sourceConverted = linearTosRGB( source );
    T destConverted = linearTosRGB( dest );
    T result = BlendUsingOperator( blendOperator, sourceConverted, destConverted, blendingCoefficient );
    return sRGBToLinear( result );
}

// ----------------------------------------------------------------
// Blend operator decoding
// ----------------------------------------------------------------
struct BlendOperatorCollection
{
    uint operators[SUBROUTINE_BLEND_MAX_ENUM];
};

BlendOperatorCollection newBlendOperatorCollection()
{
    BlendOperatorCollection result;
    
    for( int i = 0; i < SUBROUTINE_BLEND_MAX_ENUM; ++i )
    {
        result.operators[i] = MATERIAL_LAYER_BLENDING_MODE_STANDARD;
    }
    
    return result;
}

BlendOperatorCollection DecodeBlendOperators( uint2 encodedBlendOperators )
{
    // Load blend operators for layer - needs to agree with code in SRMerge.h
    const uint BITS_PER_BLEND_OPERATOR = 4;
    const uint BITS_PER_LAYER = BITS_PER_BLEND_OPERATOR * SUBROUTINE_BLEND_MAX_ENUM;
    const uint BITS_PER_UINT = 8 * sizeof( uint );
    const uint ENTRIES_PER_LAYER = BITS_PER_LAYER / BITS_PER_UINT + ( BITS_PER_LAYER % BITS_PER_UINT != 0 ? 1 : 0 );
				
    BlendOperatorCollection result;
    uint operatorIndex = 0;
		
    HINT_UNROLL

    for( uint shift = 0; shift < BITS_PER_UINT; shift += BITS_PER_BLEND_OPERATOR )
    {
        result.operators[operatorIndex] = ( ( encodedBlendOperators.x >> shift ) & 0xF );
        ++operatorIndex;
    }
		
    HINT_UNROLL

    for( uint shift = 0; shift < BITS_PER_UINT; shift += BITS_PER_BLEND_OPERATOR )
    {
        result.operators[operatorIndex] = ( ( encodedBlendOperators.y >> shift ) & 0xF );
        ++operatorIndex;
    }
    
    return result;
}

uint DecodeDisplacementBlendOperator( uint2 encodedBlendOperators )
{
    return ( encodedBlendOperators.x ) & 0xF;
}

#endif  // LAYER_BLEND_FRAG
