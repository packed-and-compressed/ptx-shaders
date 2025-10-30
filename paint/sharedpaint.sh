#ifndef MSET_SHARED_PAINT_H
#define MSET_SHARED_PAINT_H

#if defined(__cplusplus)
namespace mset
{
#endif

#if defined(__cplusplus)
    static 
#endif
    float computeBrushAlphaDist( float dist, float brushHardness )
    {
        #if defined(__cplusplus)
            return dist * 0.5f * ((1.f-brushHardness)*1.414f + brushHardness*2.f) ; 
        #else
            return dist * 0.5f * mix(1.414f, 2.f, brushHardness);
        #endif
    }

#if defined(__cplusplus)
}
#endif

#endif // MSET_SHARED_PAINT_H
