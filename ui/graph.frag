USE_TEXTURE2D(tValues);
uniform vec3 uScaleBias;
uniform vec4 uColor;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2  coord = 0.5 * vec2( fCoord.x+1.0, fCoord.y+1.0 );
	float t = saturate(1.0-coord.x) * uScaleBias.z;
	float y = coord.y;
	if( t > 1.0 ) { discard; }

	float value = texture2DLod( tValues, vec2(1.0-t, 0.5), 0.0 ).x * uScaleBias.x + uScaleBias.y;
	OUT_COLOR0  = step( y, value ) * uColor;
}
