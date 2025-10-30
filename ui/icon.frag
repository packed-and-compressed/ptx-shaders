USE_TEXTURE2D(tImage);

uniform vec4	uColor;

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 c = uColor * texture2D( tImage, fTexCoord );
	if( c.a <= (8.0/255.0) )
	{ discard; }

	OUT_COLOR0 = c;
}