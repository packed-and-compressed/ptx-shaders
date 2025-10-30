//inherits albedoMap.frag

#define ALBEDO_FLAG_USEVERTEXCOLOR	(1u<<28)
#define ALBEDO_FLAG_USEVERTEXALPHA	(1u<<29)
#define ALBEDO_FLAG_USEVERTEXSRGB	(1u<<30)

void AlbedoVertex( in AlbedoMapParams p, inout MaterialState m, in FragmentState s )
{
    AlbedoMap( p, m, s );

	vec4 vc = s.vertexColor;

	HINT_FLATTEN
	if( p.texture & ALBEDO_FLAG_USEVERTEXSRGB )
	{
		//sRGB conversion
		vc.rgb = (vc.rgb*vc.rgb)*(vc.rgb*vec3(0.2848,0.2848,0.2848) + vec3(0.7152,0.7152,0.7152));
	}
	#if defined(MATERIAL_PASS_LIGHT)
		//enforce minimum vertex color so that demodulation for component shading works
		vc.rgb = max( vc.rgb, 1e-6 );
	#endif

	HINT_FLATTEN
	if( p.texture & ALBEDO_FLAG_USEVERTEXCOLOR )
	{
		//color enabled
		m.albedo.rgb *= vc.rgb;
		m.scatterColor *= vc.rgb;
		m.hairAlbedo *= vc.rgb;
	}

	HINT_FLATTEN
	if( p.texture & ALBEDO_FLAG_USEVERTEXALPHA )
	{
		//alpha enabled
		m.albedo.a *= vc.a;
	}
}

float AlbedoVertexOpacity( in AlbedoMapParams p, SampleCoord tc, FragmentState s )
{
    float result = AlbedoMapOpacity( p, tc, s );
    
	HINT_FLATTEN
    if( p.texture & ALBEDO_FLAG_USEVERTEXALPHA )
    {
		//alpha enabled
        result *= s.vertexColor.a;
    }
	
    return result;

}

#undef  Albedo
#define Albedo(p,m,s)			AlbedoVertex(p.albedo,m,s)

#undef AlbedoOpacity
#define AlbedoOpacity(p,tc,s)	AlbedoVertexOpacity(p.albedo,tc,s)