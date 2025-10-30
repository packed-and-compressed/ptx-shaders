#ifndef MSET_FLOATMAP_SH
#define MSET_FLOATMAP_SH

// https://www.jeremyong.com/graphics/2023/09/05/f32-interlocked-min-max-hlsl/
// Check isnan(value) before use.
uint orderPreservingFloatMap(float value)
{
    // For negative values, the mask becomes 0xffffffff.
    // For positive values, the mask becomes 0x80000000.
    uint uvalue = asuint(value);
    uint mask = -int(uvalue >> 31) | 0x80000000;
    return uvalue ^ mask;
}

float inverseOrderPreservingFloatMap(uint value)
{
    // If the msb is set, the mask becomes 0x80000000.
    // If the msb is unset, the mask becomes 0xffffffff.
    uint mask = ((value >> 31) - 1) | 0x80000000;
    return asfloat(value ^ mask);
}

#endif
