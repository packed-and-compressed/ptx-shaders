USE_TEXTURE2D(tImage);

uniform float	uAlpha;
uniform float	uUseAlpha;

BEGIN_PARAMS
    INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 backdrop = texture2D( tImage, fCoord );
	backdrop.a    = mix( uAlpha, uAlpha*backdrop.a, uUseAlpha );
	OUT_COLOR0    = vec4( backdrop.rgb * backdrop.a, backdrop.a );
}
