
USE_TEXTURE2D(tTex);
uniform float	uPremultAlpha;
uniform vec2	uSampleStep;

#ifndef COLOR_PROCESSOR
#define COLOR_PROCESSOR ;
#endif

void processColor(inout vec4 c, in vec2 uv)
{
	COLOR_PROCESSOR
}

BEGIN_PARAMS
	INPUT0(vec4,fColor)
	INPUT1(vec2, fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//4x4 SSAA: we corner-sample four 2x2 blocks and add them together
	vec4 tap[4];
	tap[0] = texture2D( tTex, fTexCoord + uSampleStep * vec2( 1.0, 1.0) );
	tap[1] = texture2D( tTex, fTexCoord + uSampleStep * vec2(-1.0, 1.0) );
	tap[2] = texture2D( tTex, fTexCoord + uSampleStep * vec2(-1.0,-1.0) );
	tap[3] = texture2D( tTex, fTexCoord + uSampleStep * vec2( 1.0,-1.0) );

	vec4 sum = vec4(0.0,0.0,0.0,0.0);
	
	// simple accumulation	
	HINT_UNROLL
	for( int i=0; i<4; ++i )
	{
		sum = (tap[i] * 0.25) + sum;
	}
	
	/*
	// premultiplied alpha accumulation
	HINT_UNROLL
	for( int i=0; i<4; ++i )
	{
		sum.rgb += tap[i].rgb * tap[i].a * 0.25;
		sum.a += tap[i].a * 0.25;
	}
	sum.rgb /= max(0.001, sum.a);
	*/
	

	OUT_COLOR0 = fColor * sum;
	OUT_COLOR0.rgb *= mix(sum.a, 1.0, uPremultAlpha);
	processColor(OUT_COLOR0, fTexCoord);
}
