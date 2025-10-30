//inherits alpha.frag

uniform float   uTransparencyDitherOffset;

void	TransparencyDitherTest( in MaterialState m, in FragmentState s, float alpha )
{
	float noise;
	{
		vec2 seed = vec2(s.screenCoord) + 32.0 * m.vertexTexCoord.uvCoord.xy;
		noise = fract( cos( dot(seed, vec2( 23.14069263277926, 2.665144142690225 ) ) ) * 12345.6789 );
		noise = fract( noise + uTransparencyDitherOffset );
	}
    if( alpha <= noise )
	{ discard; }
}

void TransparencyDitherMerge( in MaterialState m, inout FragmentState s )
{
	#if !defined(MATERIAL_PASS_PAINT) && !defined(MATERIAL_PASS_EXPORT)
		TransparencyDitherTest( m, s, s.albedo.a );
	#endif
}

#undef	TransparencyMerge
#undef	TransparencyMergeFunction
#define	TransparencyMerge				TransparencyDitherMerge
#define TransparencyMergeFunction   	TransparencyDitherMerge
