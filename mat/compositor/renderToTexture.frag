USE_TEXTURE2D(tMap);

uniform vec4	uSwizzle;
uniform vec2	uBrightnessContrastScaleBias;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(float)
END_PARAMS
{
	float value = dot( texture2D( tMap, fCoord ), uSwizzle );
    value = uBrightnessContrastScaleBias.x * value + uBrightnessContrastScaleBias.y;
	OUT_COLOR0 = value;
}
