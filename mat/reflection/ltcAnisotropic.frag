#ifndef LTC_ANISOTROPIC_GGX_FRAG
#define LTC_ANISOTROPIC_GGX_FRAG
#include "data/shader/mat/other/ltcCommon.frag"

#define LTC_ANISOTROPIC_GGX_LUT_WIDTH (8)
#define LTC_ANISOTROPIC_GGX_LUT_HEIGHT (8)
#define LTC_ANISOTROPIC_GGX_LUT_DEPTH (8)

#ifndef LTC_ANISOTROPIC_GGX_LUT
#define LTC_ANISOTROPIC_GGX_LUT
USE_TEXTURE3D(tLTC_AnisotropicGGX_1);
USE_TEXTURE3D(tLTC_AnisotropicGGX_2);
USE_TEXTURE3D(tLTC_AnisotropicGGX_3);
USE_BUFFER(uint, bLTC_Anisotropic_MagnitudeFresnel);
#endif

struct LtcAnisotropicMatrix
{
    vec3 r0;
    vec3 r1;
    vec3 r2;
};

vec2 ltcAnisotropicGGXGetMagnitudeFresnel(ivec4 P)
{
    const uint index = P.x + LTC_ANISOTROPIC_GGX_LUT_WIDTH * (P.y + LTC_ANISOTROPIC_GGX_LUT_HEIGHT * (P.z + LTC_ANISOTROPIC_GGX_LUT_DEPTH * P.w));
    uint packed = bLTC_Anisotropic_MagnitudeFresnel[index];
    return vec2( f16tof32( packed ), f16tof32( packed >> 16 ) );
}

vec2 ltcAnisotropicGGXMagnitudeFresnel(vec4 P)
{
    const ivec4 res = ivec4(8,8,8,8);
    const vec4 Ps = P * vec4(res - 1);
    const ivec4 Ps_f = min(ivec4(Ps) , res - 1);
    const ivec4 Ps_c = min(ivec4(Ps) + 1, res - 1);
    const vec4 w = fract(Ps);

    // TODO: @kh, Look into using 8x3D textures for this 4D LUT, for possible optimization - 
    // "it might be better for performance to use 8 3D textures (RG16F), determine 2 "adjacent" ones, then sample them and manually lerp
    //  this way we get native filtering in half-float and potentially slightly better cache locality due to HW-optimal layout of those 3D "slices" of this 4D LUT. ~ms"

    // Fetch data
    const vec2 m0000 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_f.y, Ps_f.z, Ps_f.w));
    const vec2 m0001 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_f.y, Ps_f.z, Ps_f.w));
    const vec2 m0010 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_c.y, Ps_f.z, Ps_f.w));
    const vec2 m0011 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_c.y, Ps_f.z, Ps_f.w));
    const vec2 m0100 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_f.y, Ps_c.z, Ps_f.w));
    const vec2 m0101 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_f.y, Ps_c.z, Ps_f.w));
    const vec2 m0110 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_c.y, Ps_c.z, Ps_f.w));
    const vec2 m0111 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_c.y, Ps_c.z, Ps_f.w));
    const vec2 m1000 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_f.y, Ps_f.z, Ps_c.w));
    const vec2 m1001 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_f.y, Ps_f.z, Ps_c.w));
    const vec2 m1010 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_c.y, Ps_f.z, Ps_c.w));
    const vec2 m1011 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_c.y, Ps_f.z, Ps_c.w));
    const vec2 m1100 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_f.y, Ps_c.z, Ps_c.w));
    const vec2 m1101 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_f.y, Ps_c.z, Ps_c.w));
    const vec2 m1110 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_f.x, Ps_c.y, Ps_c.z, Ps_c.w));
    const vec2 m1111 = ltcAnisotropicGGXGetMagnitudeFresnel(ivec4(Ps_c.x, Ps_c.y, Ps_c.z, Ps_c.w));

    // Lerp first dimension
    const vec2 m000 = lerp(m0000, m0001, w.x);
    const vec2 m001 = lerp(m0010, m0011, w.x);
    const vec2 m010 = lerp(m0100, m0101, w.x);
    const vec2 m011 = lerp(m0110, m0111, w.x);
    const vec2 m100 = lerp(m1000, m1001, w.x);
    const vec2 m101 = lerp(m1010, m1011, w.x);
    const vec2 m110 = lerp(m1100, m1101, w.x);
    const vec2 m111 = lerp(m1110, m1111, w.x);

    // Lerp second dimension
    const vec2 m00 = lerp(m000, m001, w.y);
    const vec2 m01 = lerp(m010, m011, w.y);
    const vec2 m10 = lerp(m100, m101, w.y);
    const vec2 m11 = lerp(m110, m111, w.y);

    // Lerp third dimension
    const vec2 m0 = lerp(m00, m01, w.z);
    const vec2 m1 = lerp(m10, m11, w.z);

    // Lerp fourth dimension and return
    return lerp(m0, m1, w.w);
}

LtcAnisotropicMatrix ltcAnisotropicGGXGetMatrix(vec3 P)
{
    const vec4 m0 = texture3D(tLTC_AnisotropicGGX_1, P);
    const vec4 m1 = texture3D(tLTC_AnisotropicGGX_2, P);
    const float m2 = texture3D(tLTC_AnisotropicGGX_3, P).r;
    LtcAnisotropicMatrix result;
    result.r0 = vec3(m0.x, m0.y, m0.z);
    result.r1 = vec3(m0.w, m1.x, m1.y);
    result.r2 = vec3(m1.z, m1.w, m2);
    return result;
}

// This is a workaround for the lack of mix() overload for matrices in MSL
// It's quite a bummer, but so far this is the only use case of mix for matrix, so we can live with it
// In the future if someone encounters the same problem, we can add overloads/macros for other matrix types in MetalShaderStrings.h
mat3 ltcLerpMatrix(LtcAnisotropicMatrix a, LtcAnisotropicMatrix b, float t)
{
    vec3 r0 = lerp(a.r0, b.r0, t);
    vec3 r1 = lerp(a.r1, b.r1, t);
    vec3 r2 = lerp(a.r2, b.r2, t);
    // transpose(colmajor())
    return mat3_rowmajor(r0, r1, r2);
}

mat3 ltcAnisotropicGGXMatrix(vec4 P)
{
    // Fetch 3D texture
    const float ws = P.w * 7.0f;
    const float ws_f = floor(ws);
    const float ws_c = min(floor(ws + 1.0f), 7.0f);
    const float w = fract(ws);

    const float x = (P.x * 7.0 + 0.5) / 8.0;
    const float y = (P.y * 7.0 + 0.5) / 8.0;
    const float z1 = ((P.z * 7.0 + 8.0 * ws_f + 0.5) / 64.0);
    const float z2 = ((P.z * 7.0 + 8.0 * ws_c + 0.5) / 64.0);

    const LtcAnisotropicMatrix m1 = ltcAnisotropicGGXGetMatrix(vec3(x, y, z1));
    const LtcAnisotropicMatrix m2 = ltcAnisotropicGGXGetMatrix(vec3(x, y, z2));

    // Perform linear interpolation
    return ltcLerpMatrix(m1, m2, w);
}

LtcSample SampleAnisotropicLTC(vec3 V, TangentBasis tbn, vec2 R, inout LightRect rect)
{
    R = clamp(R, vec2(1e-3, 1e-3), vec2(1.0, 1.0));
    LtcSample result;
    
    const vec3 wo = transformVecTo( tbn, V );
    const float thetaO = acos(wo.z);
    const bool flipConfig = R.y > R.x;
    const float phiO_tmp = atan2(wo.y, wo.x);
    const float phiO_tmp2 = flipConfig ? (PI * 0.5f - phiO_tmp) : phiO_tmp;
    const float phiO = phiO_tmp2 >= 0.0f ? phiO_tmp2 : phiO_tmp2 + TWOPI;
    const float alpha = ((flipConfig ? R.y : R.x) - 1e-3) / (1.0f - 1e-3);
    const float lambda = (flipConfig ? R.x / R.y : R.y / R.x);
    const float theta = 2.0f * thetaO * INVPI;
    float phi = 0.0f;

    // Section 6.1 Parameterization of the Look-Up Table
    // Eq. (13)
    mat3 flip = mat3_colmajor(
                            vec3(1, 0, 0),
                            vec3(0, 1, 0),
                            vec3(0, 0, 1));
                        
    // if 0 <= phi < PI/2
    //      [1  0  0]
    // M =  [0  1  0]
    //      [0  0  1]
    if (phiO < PI * 0.5f)
    {
        phi = phiO;
        flip = mat3_colmajor(
                        vec3(1.0, 0.0, 0.0),
                        vec3(0.0, 1.0, 0.0),
                        vec3(0.0, 0.0, 1.0));
    }
    // if PI/2 <= phi < PI
    //      [-1  0  0]
    // M =  [ 0  1  0]
    //      [ 0  0  1]
    else if (phiO >= PI * 0.5f && phiO < PI)
    {
        phi = PI - phiO;
        flip = mat3_colmajor(
                        vec3(-1.0, 0.0, 0.0),
                        vec3( 0.0, 1.0, 0.0),
                        vec3( 0.0, 0.0, 1.0));
        LightRect rect_tmp = rect;
        rect.p0 = rect_tmp.p3; rect.p1 = rect_tmp.p2; rect.p2 = rect_tmp.p1; rect.p3 = rect_tmp.p0;
    }
    // if PI <= phi < 3PI/2
    //      [-1  0  0]
    // M =  [ 0 -1  0]
    //      [ 0  0  1]
    else if (phiO >= PI && phiO < 1.5f * PI)
    {
        phi = phiO - PI;
        flip = mat3_colmajor(
                        vec3(-1.0,  0.0, 0.0),
                        vec3( 0.0, -1.0, 0.0),
                        vec3( 0.0,  0.0, 1.0));
    }
    // if 3PI/2 <= phi < 2PI
    //     [ 1  0  0]
    // M = [ 0 -1  0]
    //     [ 0  0  1]
    else if (phiO >= 1.5f * PI && phiO < TWOPI)
    {
        phi = TWOPI - phiO;
        flip = mat3_colmajor(
                        vec3(1.0,  0.0, 0.0),
                        vec3(0.0, -1.0, 0.0),
                        vec3(0.0,  0.0, 1.0));
        LightRect rect_tmp = rect;
        rect.p0 = rect_tmp.p3; rect.p1 = rect_tmp.p2; rect.p2 = rect_tmp.p1; rect.p3 = rect_tmp.p0;
    }

    const vec4 u = vec4(phi / (PI * 0.5f), theta, lambda, alpha);
    result.Minv = mul(flip, ltcAnisotropicGGXMatrix(u));
    const vec2 magnitudeFresnel = ltcAnisotropicGGXMagnitudeFresnel(u);
    result.magnitude = magnitudeFresnel.x;
    result.fresnel = magnitudeFresnel.y;

    // Eq. (15)
    // if a_x >= a_y
    //     [1  0  0]
    // M = [0  1  0]
    //     [0  0  1]
    // else
    //     [0  1  0]
    // M = [1  0  0]
    //     [0  0  1]
    if (flipConfig)
    {
        const mat3 rotMatrix = mat3_colmajor(
                                            vec3(0, 1, 0),
                                            vec3(1, 0, 0),
                                            vec3(0, 0, 1));
        result.Minv = mul(rotMatrix, result.Minv);
        LightRect rect_tmp = rect;
        rect.p0 = rect_tmp.p3; rect.p1 = rect_tmp.p2; rect.p2 = rect_tmp.p1; rect.p3 = rect_tmp.p0;
    }

    // Section 7, Matrix Inversion
    // The 3D look-up table stores M instead of M^-1 due to interpolating the inverse creates severre distortions with coarse resolution.
    // So we interpolate M instead, then invert the matrix during runtime.
    result.Minv = inverse(result.Minv);
    return result;
}

#endif
