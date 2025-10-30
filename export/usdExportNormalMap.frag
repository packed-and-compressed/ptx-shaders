USE_TEXTURE2D(tTexture);

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 tc = fTexCoord;
	vec4 c = texture2D( tTexture, tc );

	vec3 n = 2.f * c.xyz - 1.f;
	n.z = sqrt( saturate( 1.0 - dot( n.xy, n.xy ) ) );
	c.z = n.z;
	c.a = 1.f;

	OUT_COLOR0 = c;
}
