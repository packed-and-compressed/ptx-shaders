uniform vec4 uColor;

BEGIN_PARAMS
    OUTPUT_COLOR0(vec4)
#ifdef OUTPUT_SECONDARY
    OUTPUT_COLOR1(vec4)
#endif
END_PARAMS
{
    OUT_COLOR0 = uColor;
#ifdef OUTPUT_SECONDARY
    OUT_COLOR1 = uColor;
#endif
}
