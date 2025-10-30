#ifdef SEAMLESS
	#include "skirtPadding.sh"
#endif

USE_TEXTURE2D( tNormalMap );
uniform vec3	uNormalScale;
uniform vec3	uNormalBias;

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	//sample normals
	vec3 n = texture2DLod( tNormalMap, fBufferCoord, 0.0 ).xyz;
	n = normalize( n * uNormalScale + uNormalBias );
	
	//we pack only the xy components, scaled and biased
	vec2 packed = 0.5 * n.xy + vec2( 0.5, 0.5 );

	#ifdef SEAMLESS
		//we mark the exterior of the UV islands with a nonunit vector: x=-1,y=-1
		int pixelMapIndex = getRasterPixelMapIndex( fBufferCoord );
		if( pixelMapIndex <= 0 )
		{ packed = vec2(0.0,0.0); }
	#endif

	//done
	OUT_COLOR0.xy = packed;
	OUT_COLOR0.zw = vec2(0.0,1.0);
}