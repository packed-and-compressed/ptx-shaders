#ifdef ACCUMULATE_DEPTH
	USE_TEXTURE2D(tDepth);
#endif
#ifdef ACCUMULATE_FEATURES
	USE_TEXTURE2DARRAY(tFeatures);	
#endif

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

#ifdef ACCUMULATE_FEATURES
	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
#else
	OUTPUT_COLOR0(float)
#endif
END_PARAMS
{
	#ifdef RENDERTARGET_Y_DOWN
		vec2 screenCoord = vec2( 0.5,-0.5 ) * fCoord + vec2( 0.5, 0.5 );
	#else
		vec2 screenCoord = vec2( 0.5, 0.5 ) * fCoord + vec2( 0.5, 0.5 );
	#endif

	float depth = 0.0;
	vec3 albedo = vec3( 0.0, 0.0, 0.0 );
	vec3 normal = vec3( 0.0, 0.0, 0.0 );
	#ifdef ACCUMULATE_DEPTH
		depth = texture2DLod( tDepth, screenCoord, 0 ).r;
	#endif
	#ifdef ACCUMULATE_FEATURES
		albedo = texture2DArrayLod( tFeatures, vec3(screenCoord,0.0), 0 ).rgb;
		normal = texture2DArrayLod( tFeatures, vec3(screenCoord,1.0), 0 ).rgb;
		normal = clamp( 2.0 * normal - vec3(1.0,1.0,1.0), -1.0, 1.0 );
	#endif

	#ifdef ACCUMULATE_FEATURES
		OUT_COLOR0 = vec4( albedo, 0.0 );
		OUT_COLOR1 = vec4( normal, 0.0 );
	#else
		OUT_COLOR0 = depth;
	#endif
}
