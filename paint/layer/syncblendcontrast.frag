#ifndef _SYNC_BLEND_CONTRAST_FRAG
#define _SYNC_BLEND_CONTRAST_FRAG

USE_TEXTURE2D( tSourceMap );
#if defined( USE_INPUT )
	USE_TEXTURE2D( tBaseMap );
#endif

uniform float	uContrast;

float _contrast1f( float value, float contrast, float center )
{
	value = (value - center) * contrast + center;	
	return saturate( value );
}

void blendCurvature( inout float v, float base )
{
	v = lerp( 0.5, v, uContrast );

	#if defined( USE_INPUT ) 
		base = base * 2.0 - 1.0;
		v = v * 2.0 - 1.0;
		v += base;
		v = max( -1.0, min( v, 1.0 ) );
		v = 0.5 * v + 0.5;
	#endif // defined( USE_INPUT ) 
}

void blendHeight( inout float v, float base )
{
	v = lerp( 0.5, v, uContrast );

	#if defined( USE_INPUT ) 
		if ( v < 0.5 )
		{ v = 2.0 * base * v; }
		else
		{ v = 1.0 - 2.0 * ( 1.0 - v ) * ( 1.0 - base ); }
	#endif // defined( USE_INPUT ) 
}

void blendAO( inout float v, float base )
{
	//multi-bounce approximation
	{
		float albedo = 0.5;
		float a =  2.0404 * albedo - 0.3324;
		float b = -4.7951 * albedo + 0.6417;
		float c =  2.7552 * albedo + 0.6903;
		v = max( v, ( ( v * a + b ) * v + c ) * v );
	}

	v = _contrast1f( v, uContrast, 1.0 );

	#if defined( USE_INPUT ) 
		//blend detail AO on top of baked geometry AO
		v *= base;
	#endif // defined( USE_INPUT ) 
}

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	float v = texture2DLod( tSourceMap, fBufferCoord, 0.0 ).r;

	#if defined( USE_INPUT )
		float base = texture2DLod( tBaseMap, fBufferCoord, 0.0 ).r;
	#else
		float base = 0.0f; // unused
	#endif

	#if defined( CURVATURE )
		blendCurvature( v, base );
	#elif defined( HEIGHT )
		blendHeight( v, base );
	#elif defined( AO )
		blendAO( v, base );
	#else
		#error Unhandled map
	#endif

	OUT_COLOR0 = vec4( v, 0.0, 0.0, 1.0 );

}

#endif