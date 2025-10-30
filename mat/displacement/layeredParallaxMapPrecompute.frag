#include "data/shader/common/projector.sh"
#include "data/shader/common/packed.sh"
#include "data/shader/common/globalBuffers.sh"

#if defined(DISPLACEMENT_PARALLAX) && MATERIAL_LAYER_COUNT > 1 && !defined(MATERIAL_PASS_COMPONENTVIEW) && !defined(MATERIAL_PASS_PAINT) && !defined(MATERIAL_PASS_COLOR_SAMPLE) && !defined(MATERIAL_PASS_SHADOWMAP)

struct DisplacementParallaxMapLayeredParams
{
	uint			blendOperator;
    uint			heightTexture;
    packed_vec2	    brightnessContrastScaleBias;
};

struct DisplacementParallaxMapInternalBufferEntry
{
    packed_uvec3			texCoordTransform; //TextureParams base
	#ifdef TextureParams
		TextureParams		texture;
	#endif
	#ifdef CompositorParams
		CompositorParams	compositor;
	#endif
    DisplacementParallaxMapLayeredParams displacement;
    #if defined(AlbedoParams) && defined(TransparencyParams)
	    AlbedoParams albedo;
    #endif
    #ifdef TransparencyParams
		TransparencyParams	transparency;
	#endif
};

USE_STRUCTUREDBUFFER(DisplacementParallaxMapInternalBufferEntry,bDisplacementParams);

struct VertexTexCoordHolder
{
    SampleCoord vertexTexCoord;
};

#define DISPLACEMENT_PARALLAX_SAMPLE_RUN_LENGTH 4

struct ParallaxSampleRun
{
    float h[DISPLACEMENT_PARALLAX_SAMPLE_RUN_LENGTH];
};

vec4 DecodeUVScaleBias( in uvec3 texCoordTransform )
{
    const uint TEX_CHANNEL_FLAG = 0x80000000;
    return unpackVec4f( uint2( texCoordTransform.x & ( ~TEX_CHANNEL_FLAG ), texCoordTransform.y ) );
}

vec2 DecodeUVRotation( in uvec3 texCoordTransform )
{
    return unpackVec2f( texCoordTransform.z );
}

vec4 CalculateLayerTexCoord( in DisplacementParallaxMapInternalBufferEntry entry, in FragmentState state, in vec4 uvScaleBias, in vec2 uvRotation )
{
    const uint TEX_CHANNEL_FLAG = 0x80000000;
    
    bool useSecondaryUVs = ( entry.texCoordTransform.x & TEX_CHANNEL_FLAG ) >> 31;
    vec2 layerTexCoord = transformUV( useSecondaryUVs ? state.vertexTexCoordSecondary.xy : state.vertexTexCoordBase.xy, uvScaleBias, uvRotation );
    vec2 layerTexGrads = vec2( 0.0, 0.0 );
    #if defined(Differentials) && defined(DifferentialTexture)
	{
		layerTexGrads = transformTextureGrads( uvScaleBias.xy, uvRotation, useSecondaryUVs ? state.vertexTexCoordSecondary.zw : state.vertexTexCoordBase.zw );
	}
    #endif	
    
    return vec4( layerTexCoord, layerTexGrads );
}

float LayeredParallaxSample( uint texture, vec2 brightnessContrastScaleBias, SampleCoord tc )
{
    #ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	    float tapX = ParallaxTextureSampleLod( texture, tc.projectorCoord.uvX.xy, 0.0, 1.0 );
        float tapY = ParallaxTextureSampleLod( texture, tc.projectorCoord.uvY.xy, 0.0, 1.0 );
        float tapZ = ParallaxTextureSampleLod( texture, tc.projectorCoord.uvZ.xy, 0.0, 1.0 );
	
        tapX = brightnessContrastScaleBias.x * tapX + brightnessContrastScaleBias.y;
        tapY = brightnessContrastScaleBias.x * tapY + brightnessContrastScaleBias.y;
        tapZ = brightnessContrastScaleBias.x * tapZ + brightnessContrastScaleBias.y;
	
	    return triplanarMix( tc.projectorCoord, tapX, tapY, tapZ );
    #else
        float value = ParallaxTextureSampleLod( texture, tc.uvCoord.xy, 0.0, 1.0 );
        value = brightnessContrastScaleBias.x * value + brightnessContrastScaleBias.y;
        return value;
    #endif
}

float BlendSample( uint blendOperator, float layerValue, float value, float blendingCoefficient, DisplacementParallaxMapInternalBufferEntry entry, SampleCoord tc, FragmentState s )
{
    #ifdef TransparencyOpacity
        float opacity = 1.0;
        #ifdef AlbedoOpacity
            opacity = AlbedoOpacity( entry, tc, s );
        #endif
        opacity = TransparencyOpacity( entry, tc, opacity );
        blendingCoefficient *= opacity;
    #endif

    return BlendField( blendOperator, layerValue, value, blendingCoefficient );
}

void OffsetSampleCoord( inout SampleCoord tc, vec2 offset )
{
    tc.uvCoord.xy += offset;
    #ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
        tc.projectorCoord.uvX.xy += offset;
        tc.projectorCoord.uvY.xy += offset;
        tc.projectorCoord.uvZ.xy += offset;
    #endif
}

template<bool CalculateH0>
ParallaxSampleRun CalculateSampleRunBase( FragmentState s, in uvec3 texCoordTransform, DisplacementParallaxMapParams p, SampleCoord vertexTexCoord, vec2 baseOffset, vec2 offset, vec2 offsetIncr, inout float h0 )
{
    ParallaxSampleRun run;

    vec2 uvRotation = DecodeUVRotation( texCoordTransform );

    vec2 layerBaseOffset = vec2( baseOffset.x * uvRotation.x - baseOffset.y * uvRotation.y,
                                 baseOffset.x * uvRotation.y + baseOffset.y * uvRotation.x );

    OffsetSampleCoord( vertexTexCoord, layerBaseOffset );

    if( CalculateH0 )
    {
        h0 = LayeredParallaxSample( p.heightTexture, p.brightnessContrastScaleBias, vertexTexCoord );
    }

    vec2 layerOffset = vec2( offset.x * uvRotation.x - offset.y * uvRotation.y,
                             offset.x * uvRotation.y + offset.y * uvRotation.x );

    OffsetSampleCoord( vertexTexCoord, layerOffset );

    vec2 layerOffsetIncr = vec2( offsetIncr.x * uvRotation.x - offsetIncr.y * uvRotation.y,
                                 offsetIncr.x * uvRotation.y + offsetIncr.y * uvRotation.x );

    for( int sampleIndex = 0; sampleIndex < DISPLACEMENT_PARALLAX_SAMPLE_RUN_LENGTH; ++sampleIndex )
    {
        run.h[sampleIndex] = LayeredParallaxSample( p.heightTexture, p.brightnessContrastScaleBias, vertexTexCoord );
        OffsetSampleCoord( vertexTexCoord, layerOffsetIncr );
    }

    return run;
}

template<bool CalculateH0>
ParallaxSampleRun CalculateSampleRun( FragmentState s, diff3 dp, uint paramsBaseOffset, vec2 baseOffset, vec2 offset, vec2 offsetIncr, in ParallaxSampleRun run, inout float h0 )
{
    for( int layerIndex = 1; layerIndex < MATERIAL_LAYER_COUNT; ++layerIndex )
    {
        DisplacementParallaxMapInternalBufferEntry entry = bDisplacementParams[paramsBaseOffset + layerIndex];
		
        vec4 uvScaleBias = DecodeUVScaleBias( entry.texCoordTransform );
        vec2 uvRotation = DecodeUVRotation( entry.texCoordTransform );
        uint blendOperator = entry.displacement.blendOperator;
        float blendingCoefficient = MaterialCompositeBlendFactor( entry, layerIndex, s.vertexTexCoordBase, s.vertexTexCoordSecondary, s.vertexColor );

        VertexTexCoordHolder holder;
        holder.vertexTexCoord.uvCoord = CalculateLayerTexCoord( entry, s, uvScaleBias, uvRotation );
        InitializeMaterialStateSampleCoords( entry, s, holder, dp, uvScaleBias, uvRotation );

        vec2 layerBaseOffset = vec2( baseOffset.x * uvRotation.x - baseOffset.y * uvRotation.y,
                                     baseOffset.x * uvRotation.y + baseOffset.y * uvRotation.x );

        OffsetSampleCoord( holder.vertexTexCoord, layerBaseOffset );

        if( CalculateH0 )
        {
            float layerH0 = LayeredParallaxSample( entry.displacement.heightTexture, entry.displacement.brightnessContrastScaleBias, holder.vertexTexCoord );
            h0 = BlendSample( blendOperator, layerH0, h0, blendingCoefficient, entry, holder.vertexTexCoord, s );
        }

        vec2 layerOffset = vec2( offset.x * uvRotation.x - offset.y * uvRotation.y,
                                 offset.x * uvRotation.y + offset.y * uvRotation.x );

        OffsetSampleCoord( holder.vertexTexCoord, layerOffset );

        vec2 layerOffsetIncr = vec2( offsetIncr.x * uvRotation.x - offsetIncr.y * uvRotation.y,
                                     offsetIncr.x * uvRotation.y + offsetIncr.y * uvRotation.x );

        for( int sampleIndex = 0; sampleIndex < DISPLACEMENT_PARALLAX_SAMPLE_RUN_LENGTH; ++sampleIndex )
        {
            float layerValue = LayeredParallaxSample( entry.displacement.heightTexture, entry.displacement.brightnessContrastScaleBias, holder.vertexTexCoord );
            run.h[sampleIndex] = BlendSample( blendOperator, layerValue, run.h[sampleIndex], blendingCoefficient, entry, holder.vertexTexCoord, s );
            OffsetSampleCoord( holder.vertexTexCoord, layerOffsetIncr );
        }
    }

    if( CalculateH0 )
    {
        h0 = 1.0 - h0;
    }
    
    for( int sampleIndex = 0; sampleIndex < DISPLACEMENT_PARALLAX_SAMPLE_RUN_LENGTH; ++sampleIndex )
    {
        run.h[sampleIndex] = 1.0 - run.h[sampleIndex];
    }

    return run;
}

bool RunSampleRun( ParallaxSampleRun hs, inout float i, float incr, inout float h0, inout float hit )
{
    for( int sampleIndex = 0; sampleIndex < DISPLACEMENT_PARALLAX_SAMPLE_RUN_LENGTH && i <= 1.0; ++sampleIndex, i += incr )
    {
        float h1 = hs.h[sampleIndex];
        if( i >= h1 )
        {
            //hit! now interpolate
            float r1 = i, r0 = i - incr;
            float t = ( h0 - r0 ) / ( ( h0 - r0 ) + ( -h1 + r1 ) );
            float r = ( r0 - t * r0 ) + t * r1;
            hit = r;
            return true;
        }
        else
        {
            hit = 1.0;
        }
        h0 = h1;
    }

    return false;
}

void	DisplacementLayeredParallaxMapPrecompute( in DisplacementParallaxMapParams p, in uvec3 texCoordTransform, in diff3 dp, inout MaterialState m, inout FragmentState s )
{
	vec2 depthOffset = vec2( f16tof32( p.depthOffset ), f16tof32( p.depthOffset >> 16 ) );

	vec3 dir = vec3(	dot( -s.vertexEye, s.vertexTangent ),
						dot( -s.vertexEye, s.vertexBitangent ),
						dot( -s.vertexEye, s.vertexNormal ) );
	vec2 maxOffset = dir.xy * ( depthOffset.x / ( abs( dir.z ) + 0.001 ) );
	
	s.displacement.xy = vec2( 0, 0 );
		
	float minSamples = 16.0;
	float maxSamples = float( 1u << ( ( p.quality & 0x3 ) + 6u ) );
	float samples = saturate( 3.0 * length( maxOffset ) );
	float incr = rcp( mix( minSamples, maxSamples, samples ) );

    uint displacementParamsBaseOffset = p.quality >> 2;

    ParallaxSampleRun hs;		
	float h0 = 0.0;
    float i = incr;

    #ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
        hs = CalculateSampleRunBase<true>( s, texCoordTransform, p, m.vertexTexCoord, -depthOffset.y * maxOffset, incr * maxOffset, incr * maxOffset,     h0 );
        hs =     CalculateSampleRun<true>( s, dp, displacementParamsBaseOffset,       -depthOffset.y * maxOffset, incr * maxOffset, incr * maxOffset, hs, h0 );
        if( !RunSampleRun( hs, i, incr, h0, s.displacement.y ) )
        { 
            HINT_LOOP
            while( i <= 1.0 )
            {
                    hs = CalculateSampleRunBase<false>( s, texCoordTransform, p, m.vertexTexCoord, -depthOffset.y * maxOffset, i * maxOffset, incr * maxOffset,     h0 );
                    hs =     CalculateSampleRun<false>( s, dp, displacementParamsBaseOffset,       -depthOffset.y * maxOffset, i * maxOffset, incr * maxOffset, hs, h0 );
                    if( RunSampleRun( hs, i, incr, h0, s.displacement.y ) )
                    { break; }
            }
        }
	#endif // MATERIAL_TEXTURE_MODE_TRIPLANAR

    hs = CalculateSampleRunBase<true>( s, texCoordTransform, p, m.vertexTexCoord, -depthOffset.y * maxOffset, incr * maxOffset, incr * maxOffset,     h0 );
    hs =     CalculateSampleRun<true>( s, dp, displacementParamsBaseOffset,       -depthOffset.y * maxOffset, incr * maxOffset, incr * maxOffset, hs, h0 );
    if( !RunSampleRun( hs, i, incr, h0, s.displacement.x ) )
    { 
        HINT_LOOP
        while( i <= 1.0 )
        {
                hs = CalculateSampleRunBase<false>( s, texCoordTransform, p, m.vertexTexCoord, -depthOffset.y * maxOffset, i * maxOffset, incr * maxOffset,     h0 );
                hs =     CalculateSampleRun<false>( s, dp, displacementParamsBaseOffset,       -depthOffset.y * maxOffset, i * maxOffset, incr * maxOffset, hs, h0 );
                if( RunSampleRun( hs, i, incr, h0, s.displacement.x ) )
                { break; }
        }
    }
}

#define DISPLACEMENT_PARALLAX_LAYERED

#endif
