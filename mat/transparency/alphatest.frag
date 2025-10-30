//inherits alpha.frag

uniform float   uTransparencyAlpha;

void    TransparencyAlphaTestMerge( in MaterialState m, inout FragmentState s )
{
    #if !defined(MATERIAL_PASS_PAINT) && !defined(MATERIAL_PASS_COLOR_SAMPLE)
        if( s.albedo.a < uTransparencyAlpha )
        { discard; }
    #endif
}

#undef	TransparencyMerge
#undef 	TransparencyMergeFunction
#define	TransparencyMerge		        TransparencyAlphaTestMerge
#define	TransparencyMergeFunction       TransparencyAlphaTestMerge
