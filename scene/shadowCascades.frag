#include "../common/util.sh"
#include "data/shader/mat/other/scatterUtil.sh"
#include "shadowdither.comp"

USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tNormal);
USE_TEXTURE2D(tShadowMap);
USE_TEXTURE2D(tRotationNoise);
USE_TEXTURE2D(tGel);
USE_TEXTURE2D(tVertexNormal);

uniform mat4	uShadowTextureMatrix;
uniform mat4	uUnproject;
uniform vec4	uLightSize;
uniform vec4	uRotationNoiseScaleBias;
uniform vec4	uGelTile;
uniform uint	uGelGrayscale;
uniform vec2	uShadowMapSize; // { w, h }
uniform float	uMillimeterScale;
uniform mat4	uProjection;
uniform float	uCascadeSplits[4];
uniform vec2	uAreaScales[4];
uniform mat4 	uShadowMatrices[4];
uniform mat4	uShadowTextureMatrices[4];
uniform int		uCascadeVisualize;
uniform mat4	uInvViewMatrix;
uniform vec4	uNormalOffset;

BEGIN_PARAMS
	INPUT0(vec4,fScreenCoord)
	
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//screen texcoord from projection position
	vec2 ndcCoord = fScreenCoord.xy / fScreenCoord.w;
	#ifdef RENDERTARGET_Y_DOWN
		vec2 screenCoord = vec2(0.5,-0.5)*ndcCoord + vec2(0.5,0.5);
	#else
		vec2 screenCoord = vec2(0.5,0.5)*ndcCoord + vec2(0.5,0.5);
	#endif

	//reconstruct 3D position (in camera view space) from depth value
	float clipDepth = 1.0;
	float viewDepth = texture2DLod( tDepth, screenCoord, 0.0 ).x;
	// perspective -0.0 | ortho -far-near
	if( abs( col2( uUnproject ).z ) <= 0.0 ) { clipDepth = -viewDepth; }
	vec3 pos = mulPoint( uUnproject, vec3( ndcCoord, 1.0 ) ).xyz * clipDepth;
	pos.z = viewDepth;

	// get the index of the cascade split
	uint cascadeIndex = 3;
	HINT_UNROLL for(int cIndex = 3; cIndex >= 0; --cIndex)
	{
		if( pos.z >= uCascadeSplits[cIndex] )
			cascadeIndex = cIndex;
	}

	// cascade visualization for testing
	vec3 cascadeColor;
	{
		bool vis = uCascadeVisualize != 0;
		cascadeColor.x = vis && cascadeIndex < 3 && cascadeIndex > 0 ? 0.0 : 1.0;
		cascadeColor.y = vis && cascadeIndex == 0 ? 0.0 : 1.0;
		cascadeColor.z = vis && cascadeIndex != 2 ? 0.0 : 1.0;
	}
	
	// object world position
	vec3 worldPos = mulPoint( uInvViewMatrix, pos ).xyz;
	
	// normal offset (both tex/object)
	vec3 normal = texture2DLod( tVertexNormal, screenCoord.xy, 0.0 ).xyz;

	// unpack the vertex normal which preserves sign in R11G11B10 format
	normal = normal * 2.0 - 1.0;

	vec3 normalWS = mulVec( uInvViewMatrix, normal ).xyz;

	float texelSize = 1.0 / uShadowMapSize.x;
	float normalShift = uNormalOffset[cascadeIndex];

	vec3 offsetWorldPos = worldPos + normalWS * normalShift;

	//compute shadow map space position
	vec4 texPos = mulPoint( uShadowTextureMatrix, worldPos );
	vec4 offsetTexPos = mulPoint( uShadowTextureMatrices[cascadeIndex], offsetWorldPos );
	
	//discard fragments outside the projection
	HINT_FLATTEN
	if( any(greaterThan( texPos.xyz, vec3(1.0,1.0,1.0))) ||
		any(lessThan( texPos.xyz, vec3(0.0,0.0,0.0) )) )
	{ discard; }

	//determine object position in shadow space
	vec3 objPos = mulPoint( uShadowMatrices[cascadeIndex], worldPos ).xyz;
	float objDepth = length(objPos);
	vec3 offsetObjPos = mulPoint( uShadowMatrices[cascadeIndex], offsetWorldPos ).xyz;
	float offsetObjDepth = length(offsetObjPos);

	float shadow = 1.0;
	float transDepth = 1.0;
	float casterDepth = 0.0;

	vec4 normalTap = texture2DLod(tNormal, screenCoord.xy, 0);
	
	float transScale;
	transScale = uMillimeterScale;			//turn depth units into millimeters
	transScale /= (normalTap.w + 0.001);	//normalize depth from 0-scatterDepth to 0-1
	transScale *= 0.2;						//divide by 5 to match the exponential curve to world units by appearance
	
	#ifdef SHADOWS
	#ifdef AREA_SHADOWS
		//rotation noise
		vec4 rotation = texture2D( tRotationNoise, uRotationNoiseScaleBias.xy*screenCoord + uRotationNoiseScaleBias.zw );
		rotation = 2.0*rotation - vec4(1.0,1.0,1.0,1.0);

		//light shape projection
		vec2 lightSize = uLightSize.xy + uLightSize.zz;

		//find our search space size:
		//light size projected onto near plane from pixel position. sensitive to ratio of depth vs projection bounds,
		//but this is about as good as we can do right now for our 'unitless' lightSize. -jdr
		vec2 searchSpaceSize = offsetObjDepth * (lightSize * uAreaScales[cascadeIndex] * 0.1);

		float avgOccluder = 0.0;
		float occluderCount = 0.0;
		#define	SEARCH_GRID	5
		HINT_UNROLL for( int i=0; i<SEARCH_GRID; ++i )
		HINT_UNROLL for( int j=0; j<SEARCH_GRID; ++j )
		{
			vec2 offset =	(float(i)/float(SEARCH_GRID-1) - 0.5)*rotation.xy +
							(float(j)/float(SEARCH_GRID-1) - 0.5)*rotation.zw;
			float d = texture2DLod( tShadowMap, offsetTexPos.xy + offset*searchSpaceSize, 0.0 ).x;
			HINT_FLATTEN
			if( d < objDepth )
			{
				avgOccluder += d;
				occluderCount += 1.0;
			}
		}
		
		HINT_BRANCH
		if( occluderCount > 0.0 )
		{
			//we have some occluders, let's proceed
			avgOccluder /= occluderCount;
			
			//estimate penumbra width
			//light size at distance to avg occluder, divided by projection area. decoupled from searchSpaceSize
			vec2 pwt = (offsetObjDepth-avgOccluder) * (lightSize * uAreaScales[cascadeIndex] * 0.1);
			
			shadow = 0.0;
			transDepth = 0.0;
			#define	SAMPLE_GRID	5
			HINT_UNROLL for( int i=0; i<SAMPLE_GRID; ++i )
			HINT_UNROLL for( int j=0; j<SAMPLE_GRID; ++j )
			{
				vec2 offset =	(float(i)/float(SAMPLE_GRID-1) - 0.5)*rotation.xy +
								(float(j)/float(SAMPLE_GRID-1) - 0.5)*rotation.zw;
				offset *= pwt;
				float d = texture2DLod( tShadowMap, offsetTexPos.xy + offset, 0.0 ).x;
				
				//depth offset proportional to area kernel
				d = d + d * max(abs(offset.x),abs(offset.y));
				
				shadow += float( d > objDepth );
				transDepth += computeTranslucencyDepth(objDepth, d, transScale);
			}
			shadow *= 1.0/float(SAMPLE_GRID*SAMPLE_GRID);
			transDepth *= 1.0/float(SAMPLE_GRID*SAMPLE_GRID);
		}
	#else
		#ifdef TEXTURE_GATHER
			vec4 d = textureGather( tShadowMap, offsetTexPos.xy );
			transDepth = computeTranslucencyDepth(offsetObjDepth, d.x, transScale);
			d = vec4( greaterThan( d, vec4(offsetObjDepth,offsetObjDepth,offsetObjDepth,offsetObjDepth) ) );
			float eps = 0.002;
			vec2 f = fract( offsetTexPos.xy*uShadowMapSize - vec2(0.5,0.5) + vec2(eps,eps) ) - vec2(eps,eps);
			shadow = mix( mix( d.w, d.z, f.x ), mix( d.x, d.y, f.x ), f.y );
			shadow *= shadow;

			// Blend the cascades so the difference in shadow level is not as dramatic
			HINT_BRANCH
			if( cascadeIndex != 3 )
			{
				float nextSplit = uCascadeSplits[cascadeIndex];
				float splitSize = cascadeIndex == 0 ? nextSplit : nextSplit - uCascadeSplits[cascadeIndex - 1];
				float fadeFactor = ( nextSplit - pos.z ) / splitSize;

				HINT_BRANCH
				if( fadeFactor <= 0.05 )
				{
					vec3 nextWorldPos = mulPoint(uInvViewMatrix, pos).xyz;
					float normalShift = uNormalOffset[cascadeIndex + 1];
					nextWorldPos += normalWS * normalShift;

					vec3 nextTexPos = mulPoint( uShadowTextureMatrices[cascadeIndex + 1], nextWorldPos ).xyz;
					vec3 nextObjPos = mulPoint( uShadowMatrices[cascadeIndex + 1], nextWorldPos ).xyz;
					float nextObjDepth = length( nextObjPos );
					
					vec4 nextD = textureGather( tShadowMap, nextTexPos.xy );
					nextD = vec4( greaterThan( nextD, vec4( nextObjDepth, nextObjDepth, nextObjDepth, nextObjDepth) ) );
					vec2 nextF = fract( nextTexPos.xy * uShadowMapSize - vec2(0.5, 0.5) + vec2(eps, eps) ) - vec2(eps, eps);
					float nextShadow = mix( mix( nextD.w, nextD.z, nextF.x ), mix( nextD.x, nextD.y, nextF.x ), nextF.y );
					nextShadow *= nextShadow;
					
					float lerpAmount = smoothstep( 0.0, 0.05, fadeFactor );
					shadow = lerp( nextShadow, shadow, lerpAmount );
				}
			} 
		#else
			float d = texture2DLod( tShadowMap, offsetTexPos.xy, 0.0 ).x;
			shadow = float( d > offsetObjDepth );
			transDepth = computeTranslucencyDepth(offsetObjDepth, d, transScale);
		#endif
	#endif
	#endif

	//gel
	vec3 gel = texture2D( tGel, texPos.xy * uGelTile.xy + uGelTile.zw ).xyz;
	gel = uGelGrayscale ? gel.rrr : gel;
	transDepth = 1.0 - transDepth;
	transDepth *= transDepth;
	transDepth *= transDepth;

	OUT_COLOR0.xyz = cascadeColor * applyDither(uint2(IN_POSITION.xy), shadow * gel);
	OUT_COLOR0.w = saturate(transDepth * dot(gel, vec3(0.29,0.59,0.12)));
}
