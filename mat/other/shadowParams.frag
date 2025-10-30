#ifndef SHADOW_PARAMS_FRAG
#define SHADOW_PARAMS_FRAG

#include "../../common/util.sh"
#include "lightParams.frag"

#define	MAX_SHADOWS	32

USE_TEXTURE2DARRAY(tShadow);

#if defined(MATERIAL_PASS_INTERSECT)
	//old code for shadow maps; keeping it around for the moment however
	uniform mat4	uLightShadowTransforms[MAX_SHADOWS];
	uniform mat4	uLightShadowProjections[MAX_SHADOWS];
	uniform float	uLightShadowNormalOffsets[MAX_SHADOWS];

	float	sampleShadow( vec3 position, vec3 normal, uint lightIndex, vec4 lightPos, float spotSharpness = 1.0 )
	{
		vec3 offsetPosition;
		HINT_BRANCH
		if( col3(uLightShadowProjections[lightIndex]).w != 0.0  )
		{
			offsetPosition = position + normal * uLightShadowNormalOffsets[lightIndex];
		} 
		else
		{
			float lightDist = length( lightPos.xyz - position );
			offsetPosition = position + normal * lightDist * uLightShadowNormalOffsets[lightIndex];
		}

		vec3 spos = mulPoint( uLightShadowTransforms[lightIndex], offsetPosition ).xyz;
		mat4 proj = uLightShadowProjections[lightIndex];
		vec2 tc; float vignette = 1.0;
		HINT_FLATTEN
		if( col0(proj).x == 0.0 )
		{
			//octahedral layout
			vec3 dir = spos;
			dir /= dot( vec3(1.0,1.0,1.0), abs(dir) );
			vec2 rev = abs(dir.zx) - vec2(1.0,1.0);
			vec2 neg = vec2(	dir.x < 0.0 ? rev.x : -rev.x,
								dir.z < 0.0 ? rev.y : -rev.y );
			tc = (dir.y < 0.0) ? neg : dir.xz;
			tc = 0.5*tc + vec2(0.5,0.5);
		}
		else
		{
			//2d layout
			vec4 sprj = mulPoint( proj, spos );
			tc = 0.5*(sprj.xy / sprj.w) + vec2(0.5,0.5);

			//spot vignette
			vec2 v = 2.0*tc - vec2(1.0,1.0);
			vignette = saturate( spotSharpness - spotSharpness * dot(v,v) );
			vignette = spos.z < 0.0 ? vignette : 0.0;
		}
		float dist = texture2DArrayLod( tShadow, vec3( tc.x, tc.y, float(lightIndex) ), 0.0 ).x;
		float shadow = dot(spos,spos) < dist*dist ? 1.0 : 0.0;
		return shadow * vignette;
	}
#else
	vec4	sampleShadowMask( vec2 screenCoord, float lightIndex )
	{
		return texture2DArrayLod( tShadow, vec3(screenCoord.x, screenCoord.y, lightIndex), 0.0 );
	}
#endif

#endif
