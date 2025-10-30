//Troy Sobotka's AgX display transform
//based on OpenColorIO config at https://github.com/sobotka/AgX

#include "data/shader/common/util.sh"
#include "data/shader/common/colorspace.sh"

//polynomial fit of the original LUT courtesy of Benjamin Wrensch
vec3    agxContrastApprox( vec3 x )
{
    vec3 x2 = x  * x;
    vec3 x3 = x2 * x;
    vec3 x4 = x3 * x;
    vec3 x5 = x4 * x;
    vec3 x6 = x5 * x;
    return 15.5*x6 - 40.14*x5 + 31.96*x4 - 6.868*x3 + 0.4298*x2 + 0.1191*x - 0.00232;
}

vec3    toneAgX( vec3 c )
{
    //range transform (clip negative values)
    c = max( c, 0.0 );

    //input matrix transform
    const mat3 agxInputTransform = mat3_rowmajor(
        vec3(0.842479062253094,  0.0784335999999992, 0.0792237451477643),
        vec3(0.0423282422610123, 0.878468636469772,  0.0791661274605434),
        vec3(0.0423756549057051, 0.0784336,          0.879142973793104)
    );
    c = mulVec( agxInputTransform, c );

    //allocation transform (convert to log color space)
    const float exposureMin = -12.47393; //stops
    const float exposureMax = 4.026069; //stops
    c = clamp( log2(c), exposureMin, exposureMax );
    c = ( c - exposureMin ) / ( exposureMax - exposureMin );

    //apply contrast LUT
    c = agxContrastApprox( c );

    //output matrix transform (inverse input)
    const mat3 agxOutputTransform = mat3_rowmajor(
        vec3( 1.196879005120174,   -0.0980208811401368, -0.0990297440797205),
        vec3(-0.05289685175745617,  1.151903129904173,  -0.0989611768448433),
        vec3(-0.05297163551444379, -0.0980434501171241,  1.151073672641161)
    );
    c = mulVec( agxOutputTransform, c );

    //linearize since we're outputting to an sRGB render target
    return sRGBToLinear( c );
}

#define ToneMap toneAgX
