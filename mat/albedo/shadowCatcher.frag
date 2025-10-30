#include "data/shader/common/util.sh"
#include "data/shader/mat/state.frag"

#ifdef MATERIAL_PASS_RT_PRIMARYHIT
	uniform vec4	uShadowCatcherBackground; // { Color, Mode }
	USE_TEXTURECUBE(tShadowCatcherSkyTexture);
	uniform float	uShadowCatcherSkyBrightness;
	uniform vec4	uShadowCatcherSkySampleKernel[16];
	uniform vec4	uShadowCatcherSkyCoefficients[9];
	uniform float	uShadowCatcherSkySampleLod;
	uniform mat4	uShadowCatcherViewMatrix;
	uniform mat4	uShadowCatcherViewToSkyTransform;

	#ifdef SceneHasBackdrop
		USE_TEXTURE2D(tShadowCatcherBackdrop);
		uniform mat4  uShadowCatcherBackdropProjection;
	#endif
#endif

#ifdef MATERIAL_PASS_RT_PRIMARYHIT_RASTER
	USE_TEXTURE2D(tShadowCatcherBackground);
#endif

#ifdef MATERIAL_PASS_RT_PRIMARYHIT
vec3	evaluateShadowCatcherBackground( vec3 position )
{
	vec3 color = uShadowCatcherBackground.rgb;
	uint mode  = uint(uShadowCatcherBackground.w);
	vec3 viewp = mulPoint( uShadowCatcherViewMatrix, position ).xyz;
	vec3 dir   = mulVec( uShadowCatcherViewToSkyTransform, viewp );
	
	HINT_BRANCH
	if( mode == 1 )			//STANDARD
	{
		color = textureCubeLod( tShadowCatcherSkyTexture, dir, 0.0 ).rgb * uShadowCatcherSkyBrightness;
	}
	else if( mode == 2 )	//BLUR
	{
		vec3 basisZ = normalize( dir );
		vec3 basisX = normalize( cross( vec3(0.0,1.0,0.0), basisZ ) );
		vec3 basisY = cross( basisZ, basisX );
		
		color = vec3( 0.0, 0.0, 0.0 );
		HINT_UNROLL
		for( int i=0; i<16; ++i )
		{
			vec4 s = uShadowCatcherSkySampleKernel[i];

			vec3 s0 = (basisZ + s.x*basisX) + s.y*basisY;
			color += textureCubeLod( tShadowCatcherSkyTexture, s0, uShadowCatcherSkySampleLod ).xyz;

			vec3 s1 = (basisZ + s.z*basisX) + s.w*basisY;
			color += textureCubeLod( tShadowCatcherSkyTexture, s1, uShadowCatcherSkySampleLod ).xyz;
		}
		color *= uShadowCatcherSkyBrightness * (1.0/32.0);
	}
	else if( mode == 3 )	//ESSENCE
	{
		vec3 d = normalize( dir );

		//l = 0 band
		vec3 r = uShadowCatcherSkyCoefficients[0].xyz;

		//l = 1 band
		r += uShadowCatcherSkyCoefficients[1].xyz * d.y;
		r += uShadowCatcherSkyCoefficients[2].xyz * d.z;
		r += uShadowCatcherSkyCoefficients[3].xyz * d.x;

		//l = 2 band
		vec3 swz = d.yyz * d.xzx;
		r += uShadowCatcherSkyCoefficients[4].xyz * swz.x;
		r += uShadowCatcherSkyCoefficients[5].xyz * swz.y;
		r += uShadowCatcherSkyCoefficients[7].xyz * swz.z;

		vec3 sqr = d * d;
		r += uShadowCatcherSkyCoefficients[6].xyz * ( 3.0*sqr.z - 1.0 );
		r += uShadowCatcherSkyCoefficients[8].xyz * ( sqr.x - sqr.y );

		color = r;
	}

	//optionally mixin composited backdrops
	#ifdef SceneHasBackdrop
	{
		vec4 backdropProj  = mulPoint( uShadowCatcherBackdropProjection, viewp );
		vec2 backdropCoord = backdropProj.xy / backdropProj.w;
		backdropCoord      = 0.5 * vec2( backdropCoord.x + 1.0, -backdropCoord.y + 1.0 );
		
		vec4 backdrop = texture2DLod( tShadowCatcherBackdrop, backdropCoord, 0.0 );
		color = color * (1.0 - backdrop.a) + backdrop.rgb;
	}
	#endif

	return color;
}
#endif

void	AlbedoShadowCatcher( in AlbedoShadowCatcherParams p, inout MaterialState m, inout FragmentState s )
{
	//set shading flags based on enabled shadow types
    s.allowSkySampling = p.shadowFlags & SHADOWCATCHER_FLAG_SKY;
    s.shadowCatcherIndirect = p.shadowFlags & SHADOWCATCHER_FLAG_INDIRECT;
}

void AlbedoShadowCatcherMerge( in MaterialState m, inout FragmentState s )
{
#ifdef MATERIAL_PASS_RT_PRIMARYHIT
	//evaluate background as color so that shadow catcher can render as see-through
	s.baseColor = evaluateShadowCatcherBackground( s.vertexPosition );
#endif
#ifdef MATERIAL_PASS_RT_PRIMARYHIT_RASTER
	//sample background as color so that shadow catcher can render as see-through
	s.baseColor = texture2DLod( tShadowCatcherBackground, s.screenTexCoord, 0.0 ).rgb;
#endif

	//set albedo so that indirect shadow BSDF eval works as expected
    s.albedo.rgb = s.baseColor;
}

#define Albedo(p,m,s)		AlbedoShadowCatcher(p.albedo,m,s)
#define AlbedoMerge			AlbedoShadowCatcherMerge
#define AlbedoMergeFunction	AlbedoShadowCatcherMerge
#define ShadowCatcher

#ifdef AdvancedLightSampling
#undef AdvancedLightSampling
#undef MaxLightSamplingCandidates
#endif
