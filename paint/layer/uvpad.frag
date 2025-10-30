#include "layerformat.sh"

#if defined(GEO_PASS)
#elif defined(SMEAR_PASS)	
	USE_TEXTURE2D( tTexture );
	uniform vec2	uPixelSize;	
	#define SEARCH_RADIUS 1
#else
	USE_TEXTURE2D_NOSAMPLER( tUVLUT );
	USE_TEXTURE2D( tTexture );
	USE_SAMPLER( smpNearest );
#endif

BEGIN_PARAMS
	INPUT0( vec2, fTexCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
vec4 result;
#if defined(GEO_PASS)	
	result.rg = fTexCoord;
	result.ba = vec2(0.0,1.0);

#elif defined(SMEAR_PASS)
	vec4 r = texture2DLod( tTexture, fTexCoord, 0.0 );
	HINT_BRANCH
	if( r.a <= 0.0 )
	{
		float bestDist = 1.0e9;
		HINT_UNROLL
		for( int i=-SEARCH_RADIUS; i<=SEARCH_RADIUS; ++i )
		{
			HINT_UNROLL
			for( int j=-SEARCH_RADIUS; j<=SEARCH_RADIUS; ++j )
			{
				vec2 off = vec2(float(i),float(j));
				vec4 s = texture2DLod( tTexture, fTexCoord + uPixelSize * off, 0.0 );
				float dist = dot(off,off);

				if( s.a > 0.0 && dist < bestDist )
				{
					r = s;
					bestDist = dist;
				}
			}
		}
		r.a = bestDist < 1.0e9 ? r.a : 0.0;
	}
	result = r;

#else //SAMPLE PASS
	vec2 uv = textureWithSampler( tUVLUT, smpNearest, fTexCoord ).xy;
	
	vec4 resultLinear = texture2DLod( tTexture, uv, 0.0 );
	vec4 resultNearest = textureWithSamplerLod( tTexture, smpNearest, uv, 0.0 );
	
	// UV island skirts are sampled with nearest filtering or we risk background bleeding (shark teeth)
	// inland UVs are still sampled linearly	
	vec2 delta = abs(uv - fTexCoord);
	result = mix( resultLinear, resultNearest, delta.x + delta.y > 0.0);

	//pipe the results through the input/output formatter in case we're doing any conversion with padding
	result = formatBackingColor( uBackingFormat, result );
	result = formatOutputColor( uOutputFormat, result );
#endif
	OUT_COLOR0 = result;
}
