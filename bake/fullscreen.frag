USE_TEXTURE2D( tInput );

uniform uint uFlip;

BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
	INPUT0(vec2,fCoord)
END_PARAMS
{
	vec2 c = fCoord;
	if( uFlip )
	{ c.y = 1.0 - c.y; }

	OUT_COLOR0 = texture2DLod( tInput, c, 0.0 );
}