#ifndef LTC_ISOTROPIC_GGX_FRAG
#define LTC_ISOTROPIC_GGX_FRAG
#include "data/shader/mat/other/ltcCommon.frag"

#define LTC_LUT_GGX_SIZE (64.0f)
#define LTC_LUT_GGX_SCALE ((LTC_LUT_GGX_SIZE - 1.0f)/LTC_LUT_GGX_SIZE)
#define LTC_LUT_GGX_BIAS  (0.5f/LTC_LUT_GGX_SIZE)

#ifndef LTC_GGX_LUT
#define LTC_GGX_LUT
USE_TEXTURE2D(tLTC_GGX_Matrix);
USE_TEXTURE2D(tLTC_GGX_Magnitude_Fresnel);
#endif

LtcSample SampleGGXLTC(float roughness, float NdotV)
{
    const vec2 uv = vec2(max( roughness, 0.025 ), sqrt(1.0f - saturate(NdotV))) * LTC_LUT_GGX_SCALE + LTC_LUT_GGX_BIAS;
    const vec4 t1 = texture2D( tLTC_GGX_Matrix, uv );
    const vec4 t2 = texture2D( tLTC_GGX_Magnitude_Fresnel, uv );
	
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
