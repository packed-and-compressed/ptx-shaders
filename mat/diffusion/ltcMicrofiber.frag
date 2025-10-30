#ifndef LTC_MICROFIBER_FRAG
#define LTC_MICROFIBER_FRAG
#include "data/shader/mat/other/ltcCommon.frag"

#define LTC_LUT_MICROFIBER_SIZE (64.0f)
#define LTC_LUT_MICROFIBER_SCALE ((LTC_LUT_MICROFIBER_SIZE - 1.0f)/LTC_LUT_MICROFIBER_SIZE)
#define LTC_LUT_MICROFIBER_BIAS  (0.5f/LTC_LUT_MICROFIBER_SIZE)

#ifndef LTC_MICROFIBER_LUT
#define LTC_MICROFIBER_LUT
USE_TEXTURE2D(tLTC_Microfiber_Matrix);
USE_TEXTURE2D(tLTC_Microfiber_Magnitude_Fresnel);
#endif

LtcSample SampleMicrofiberLTC(float roughness, float NdotV)
{
    const float2 uv = float2(roughness, sqrt(1.0f - saturate(NdotV))) * LTC_LUT_MICROFIBER_SCALE + LTC_LUT_MICROFIBER_BIAS;
    const float4 t1 = texture2D( tLTC_Microfiber_Matrix, uv );
    const float4 t2 = texture2D( tLTC_Microfiber_Magnitude_Fresnel, uv );
    
    LtcSample result;
    result.Minv = mat3_colmajor(
        vec3(t1.x, 0, t1.y),
        vec3(  0,  1,    0),
        vec3(t1.z, 0, t1.w)
    );
    result.magnitude = t2.x;
    result.fresnel = t2.y;
    return result;
}

#endif
