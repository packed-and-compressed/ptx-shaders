USE_TEXTURE2D(tInput);
USE_TEXTURE2D(tDepthInput);

uniform vec4	uFocusParams;	// { focusDist, maxBgCoc, 1 / maxBgCoc, filmHeight }
uniform vec2	uPixelSize;

#ifdef DOF_ALPHA
	#define Color float
	#define Black 0.0
	#define GatherSwizzle w
#else
	#define Color vec3
	#define Black vec3(0.0,0.0,0.0)
	#define GatherSwizzle xyz
#endif

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//look up depths
	vec4 depths;
	#ifdef TEXTURE_GATHER
		depths = textureGather( tDepthInput, fCoord );
	#else
		depths.x = texture2D( tDepthInput, fCoord + vec2(-.5,+.5)*uPixelSize ).x;
		depths.y = texture2D( tDepthInput, fCoord + vec2(+.5,+.5)*uPixelSize ).x;
		depths.z = texture2D( tDepthInput, fCoord + vec2(+.5,-.5)*uPixelSize ).x;
		depths.w = texture2D( tDepthInput, fCoord + vec2(-.5,-.5)*uPixelSize ).x;
	#endif

	//compute CoC from depths
	vec4 coc;
	coc = uFocusParams.y * (1.0 - uFocusParams.x / -depths);
	coc = clamp( coc, -0.19 * uFocusParams.w, 0.19 * uFocusParams.w );  //ensure a sane limit to avoid massive overdraw
	
	//look up colors 
	Color colors[4];
	#if !defined(DOF_ALPHA) && defined(TEXTURE_GATHER_RGBA)
		vec4 gr = textureGatherRed( tInput, fCoord );
		vec4 gg = textureGatherGreen( tInput, fCoord );
		vec4 gb = textureGatherBlue( tInput, fCoord );
		colors[0] = vec3( gr.x, gg.x, gb.x );
		colors[1] = vec3( gr.y, gg.y, gb.y );
		colors[2] = vec3( gr.z, gg.z, gb.z );
		colors[3] = vec3( gr.w, gg.w, gb.w );
	#else
		colors[0] = texture2D( tInput, fCoord + vec2(-.5,+.5)*uPixelSize ).GatherSwizzle;
		colors[1] = texture2D( tInput, fCoord + vec2(+.5,+.5)*uPixelSize ).GatherSwizzle;
		colors[2] = texture2D( tInput, fCoord + vec2(+.5,-.5)*uPixelSize ).GatherSwizzle;
		colors[3] = texture2D( tInput, fCoord + vec2(-.5,-.5)*uPixelSize ).GatherSwizzle;
	#endif

	//find average CoC
	float avgCoC = dot( coc, vec4(0.25,0.25,0.25,0.25) );
	Color finalColor = Black;
	float finalCoC = 0.0, finalWeight = 0.0;
	
	//reject pixels in front of the average depth from the average color
	#define	consider(color,c)\
	{	float w = saturate(c-avgCoC) < 0.02 ? 1.0 : 0.0;\
		finalColor += w * color;\
		finalCoC += w * c;\
		finalWeight += w;	}
	consider( colors[0], coc.x );
	consider( colors[1], coc.y );
	consider( colors[2], coc.z );
	consider( colors[3], coc.w );
	finalWeight = rcp( finalWeight );

	finalColor *= finalWeight;
	finalCoC   *= finalWeight;

#ifdef DOF_ALPHA
	OUT_COLOR0.xyz = vec3(finalColor, finalColor, finalColor);
#else
	OUT_COLOR0.xyz = finalColor;
#endif
	OUT_COLOR0.w = finalCoC;
}
