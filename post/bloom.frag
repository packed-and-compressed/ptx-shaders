USE_TEXTURE2D(tInput);

uniform int		uSamples;
uniform vec2	uSampleScaleBias;
uniform vec2	uSampleSize;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 c = vec3(0.0, 0.0, 0.0);
	float W = 0.0;
	HINT_LOOP
	for( int i=0; i<uSamples; ++i )
	{
		float t = float(i) * uSampleScaleBias.x + uSampleScaleBias.y;
		vec3 s = texture2DLod( tInput, fCoord + uSampleSize * t, 0.0 ).rgb;
		s = max( s, vec3(0.0,0.0,0.0) );
		float w = exp2( -32.0 * t*t );
		W += w;
		c += w * s;
	}
	c /= W;

	OUT_COLOR0.rgb = c;
	OUT_COLOR0.a = 1.0;
}
