USE_TEXTURE2D(tFar);
USE_TEXTURE2D(tNear);
USE_TEXTURE2D(tDepth);

USE_SAMPLER(sSampler);
USE_TEXTURE2D_NOSAMPLER(tLowResColor);

#ifdef DOF_ALPHA
#define DOF_ALPHA_EXPOSURE 1.4 //"fixes" issues with DOF alpha being too transparent; constant chosen by Joe ~ms
USE_TEXTURE2D(tDestAlphaCopy);
#endif

uniform vec4	uFocusParams;	// { focusDist, maxBgCoc, 1 / maxBgCoc, filmHeight }
uniform vec2	uFarBlend;
uniform vec2	uTexelSize; // { 1/w, 1/h }
uniform vec2	uBokehSize;

vec4	blurSample( vec2 c, float CoC )
{
	vec4 s = textureWithSampler( tLowResColor, sSampler, c );
	float w = 1.0 - saturate( 4.0 * abs(CoC-s.a) * -uFocusParams.z );
	s.xyz *= w;
	s.w = w;
	return s;
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//look up depth and determine CoC
	float camDist = texture2D( tDepth, fCoord ).x;
	float coc = uFocusParams.y * (1.0 - uFocusParams.x / -camDist);
	coc = clamp( coc, -0.16 * uFocusParams.w, 0.16 * uFocusParams.w );

	//sample far field
	vec4 far = texture2D( tFar, fCoord );
	far.xyz /= (far.w > 0.0) ? far.w : 1.0;
	far.w = saturate( coc*uFarBlend.x + uFarBlend.y );
	far.w *= far.w;
	
	//sample near field
	vec4 near = texture2D( tNear, fCoord );
	near.xyz /= (near.w > 0.0) ? near.w : 1.0;
	float nearScale =
	#ifdef CPR_METAL
		16.0;
	#else
		4.0;
	#endif
	near.w = saturate( nearScale * near.w );

	//need to bridge the area near the focal plane with a small manual blur here,
	//because the transitions from quad expansion don't look very good on their own.
	vec4 bridge = vec4(0.0,0.0,0.0,0.0);
	HINT_BRANCH
	if( max(far.w,near.w) < 1.0 )
	{
		vec2 br = coc * (0.35) * uBokehSize;
		
		bridge  = blurSample( fCoord, coc );

		bridge += blurSample( fCoord + vec2( 0.0,  br.y), coc );
		bridge += blurSample( fCoord + vec2( 0.0, -br.y), coc );
		bridge += blurSample( fCoord + vec2( br.x,  0.0), coc );
		bridge += blurSample( fCoord + vec2(-br.x,  0.0), coc );

		br *= 0.707;
		bridge += blurSample( fCoord + vec2( br.x, br.y), coc );
		bridge += blurSample( fCoord + vec2( br.x,-br.y), coc );
		bridge += blurSample( fCoord + vec2(-br.x, br.y), coc );
		bridge += blurSample( fCoord + vec2(-br.x,-br.y), coc );

		bridge *= (1.0/9.0);

		HINT_FLATTEN
		if( bridge.w > 0.0 )
		{
			bridge.xyz /= bridge.w;
			bridge.w = saturate( 2.0 * abs(min(br.x,br.y)) / min(uTexelSize.x,uTexelSize.y) );
		}
	}
	
	//final output
	float finalAlpha = (1.0-far.w)*(1.0-near.w)*(1.0-bridge.w);
	vec3  finalColor = mix( mix( bridge.xyz, far.xyz, far.w ), near.xyz, near.w ) * (1.0-finalAlpha);

#ifdef DOF_ALPHA
	float destAlpha = texture2D( tDestAlphaCopy, fCoord ).x;
	OUT_COLOR0.xyz  = vec3( 0.0, 0.0, 0.0 );
	OUT_COLOR0.w    = finalColor.x + finalAlpha * destAlpha; //relying on shader compiler to optimize-out unused calculations for yz ~ms
	OUT_COLOR0.w    = saturate( OUT_COLOR0.w * DOF_ALPHA_EXPOSURE );
#else
	OUT_COLOR0.xyz = finalColor;
	OUT_COLOR0.w   = finalAlpha;
#endif
}
