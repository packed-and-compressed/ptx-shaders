#ifndef LTC_LAMBERTIAN_FRAG
#define LTC_LAMBERTIAN_FRAG
#include "data/shader/mat/other/ltcCommon.frag"

// Linearly transformed cosines uses the cosine distribution, which is exactly what
// lambertian is, so the matrix here is just a identity matrix lol...

LtcSample SampleLambertianLTC()
{
    LtcSample result;
    result.Minv = mat3_colmajor(
        vec3(1, 0, 0),
        vec3(0, 1, 0),
        vec3(0, 0, 1)
    );
    result.magnitude = 1.0f; // Unused
    result.fresnel = 1.0f; // Unused
    return result;
}

#endif
