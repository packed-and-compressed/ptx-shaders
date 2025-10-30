USE_TEXTURE2D( tInput );

BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
	INPUT0(vec2,fCoord)
END_PARAMS
{
	vec4 s = imageLoad( tInput, uint2(IN_POSITION.xy) );

	//image contains transparency in high byte of alpha channel
	s.a = float( uint( s.a * float(0xffff) ) >> 8 ) * (1.0/255.0);
	
	//final composite is premultiplied alpha
	s.rgb *= s.a;

	OUT_COLOR0 = s;
}