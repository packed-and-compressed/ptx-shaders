#include "../common/util.sh"
#include "data/shader/mat/other/scatterUtil.sh"
#include "shadowdither.comp"

USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tNormal);
USE_TEXTURECUBE(tShadowMap);
USE_TEXTURE2D(tRotationNoise);
USE_TEXTURE2D(tGel);
USE_TEXTURE2D(tVertexNormal);

uniform mat4 	uShadowMatrix;
uniform mat4	uShadowTextureMatrix;
uniform mat4	uUnproject;
uniform vec4	uLightSize;
uniform vec4	uRotationNoiseScaleBias;
uniform vec4	uGelTile;
uniform uint	uGelGrayscale;
uniform vec2	uShadowMapSize; // { w, h }
uniform float	uMillimeterScale;
uniform mat4	uInvViewMatrix;
uniform vec4	uLightPosition;
uniform vec4	uNormalOffset;
uniform mat4	uViewMatrix;

vec2	cubeFaceCoords( vec3 dir )
{
	bool3 positive = greaterThanEqual( dir, vec3(0.0,0.0,0.0) );
	vec3 adir = abs(dir);
	float axis; vec2 uv;
	HINT_FLATTEN
	if( adir.x >= adir.y && adir.x >= adir.z )
	{
		//x axis
		uv.x = positive.x ? -dir.z : dir.z;
		uv.y = dir.y;
		axis = adir.x;
	}
	else if( adir.y >= adir.x && adir.y >= adir.z )
	{
		//y axis
		uv.x = dir.x;
		uv.y = positive.y ? -dir.z : dir.z;
		axis = adir.y;
	}
	else
	{
		//z axis
		uv.x = positive.z ? dir.x : -dir.x;
		uv.y = dir.y;
		axis = adir.z;
	}
	return 0.5 * (uv / axis) + vec2(0.5,0.5);
}

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

	// object world position
	vec3 worldPos = mulPoint( uInvViewMatrix, pos ).xyz;
	
	// normal offset (both tex/object)
	vec3 normal = texture2DLod( tVertexNormal, screenCoord.xy, 0.0 ).xyz;

	// unpack the vertex normal which preserves sign in R11G11B10 format
	normal = normal * 2.0 - 1.0;

	vec3 normalWS = mulVec( uInvViewMatrix, normal ).xyz;

	float lightDist = length(uLightPosition.xyz - worldPos);
	float normalShift = lightDist * uNormalOffset.x;
	vec3 offsetWorldPos = worldPos + normalWS * normalShift;

	vec3 offsetPos = mulPoint( uViewMatrix, offsetWorldPos ).xyz;

	mat4 shadowMat = mul(uShadowMatrix, uInvViewMatrix);

	//determine object position in shadow space
	pos = mulPoint( shadowMat, pos ).xyz;
	float depth = length(pos);

	offsetPos = mulPoint( shadowMat, offsetPos ).xyz;
	float offsetDepth = length(offsetPos);

	float shadow = 1.0;
	float transDepth = 0.0;

	vec4 normalTap = texture2DLod(tNormal, screenCoord.xy, 0);
	float transScale;
	transScale = uMillimeterScale;			//turn depth units into millimeters
	transScale /= (normalTap.w + 0.001);	//normalize depth from 0-scatterDepth to 0-1
	transScale *= 0.2;						//divide by 5 to match the exponential curve to world units by appearance
	

	#ifdef SHADOWS
	#ifdef AREA_SHADOWS
		//noise rotation & sample basis
		vec4 rotation = texture2D( tRotationNoise, uRotationNoiseScaleBias.xy*screenCoord + uRotationNoiseScaleBias.zw );
		rotation = 2.0*rotation - vec4(1.0,1.0,1.0,1.0);
		vec3 objX = normalize( cross( vec3(0.0,1.0,0.0), -offsetPos ) );
		vec3 objY = normalize( cross( -offsetPos, objX ) );

		//find our search space size
		vec3 ox = objX * uLightSize.z, oy = objY * uLightSize.z;
		ox.x += uLightSize.x; oy.y += uLightSize.y;

		//search for occluders
		float avgOccluder = 0.0;
		float occluderCount = 0.0;
		#define	SEARCH_GRID	5
		HINT_UNROLL for( int i=0; i<SEARCH_GRID; ++i )
		HINT_UNROLL for( int j=0; j<SEARCH_GRID; ++j )
		{
			vec2 offset =	(float(i)/float(SEARCH_GRID-1) - 0.5)*rotation.xy +
							(float(j)/float(SEARCH_GRID-1) - 0.5)*rotation.zw;
			vec3 p = (offsetPos + offset.x*ox) + offset.y*oy;
			float d = textureCubeLod( tShadowMap, p, 0.0 ).x;
			HINT_FLATTEN
			if( d < offsetDepth )
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
			vec4 pw = ((offsetDepth - avgOccluder) * uLightSize) / avgOccluder;
			ox = objX * pw.z; oy = objY * pw.z;
			ox.x += pw.x; oy.y += pw.y;
			
			//sample shadow
			shadow = 0.0;
			transDepth = 0.0;
			#define	SAMPLE_GRID	5
			HINT_UNROLL for( int i=0; i<SAMPLE_GRID; ++i )
			HINT_UNROLL for( int j=0; j<SAMPLE_GRID; ++j )
			{
				vec2 offset =	(float(i)/float(SEARCH_GRID-1) - 0.5)*rotation.xy +
								(float(j)/float(SEARCH_GRID-1) - 0.5)*rotation.zw;
				vec3 o = offset.x*ox + offset.y*oy;
				float d = textureCubeLod( tShadowMap, offsetPos + o, 0.0 ).x;
				
				//depth offset proportional to area kernel
				d += length(o);
				
				shadow += float( d > offsetDepth );
				transDepth += computeTranslucencyDepth(offsetDepth, d, transScale);
			}
			shadow  *= 1.0/float(SAMPLE_GRID*SAMPLE_GRID);
			transDepth *= 1.0/float(SAMPLE_GRID*SAMPLE_GRID);
		}
	#else		
		#ifdef TEXTURE_GATHER
			vec4 d = textureGather( tShadowMap, offsetPos );
			transDepth = computeTranslucencyDepth(offsetDepth, d.x, transScale);
			d = vec4( greaterThan( d, vec4(offsetDepth,offsetDepth,offsetDepth,offsetDepth) ) );
			
			vec2 uv = cubeFaceCoords( offsetPos );
			vec2 w = frac( uv * uShadowMapSize - (vec2(0.5,0.5) + vec2(0.002,0.002)) );
			shadow = mix( mix( d.w, d.z, w.x ), mix( d.x, d.y, w.x ), 1.0-w.y );
		#else
			float d = textureCubeLod( tShadowMap, offsetPos, 0.0 ).x;
			shadow = float( d > offsetDepth );
			transDepth = computeTranslucencyDepth(offsetDepth, d, transScale);
		#endif
	#endif
	#endif

	//gel
	vec2 geluv = (pos/depth).xy;
	geluv.y = 1.0f - geluv.y;
	vec3 gel = texture2D( tGel, geluv * uGelTile.xy + uGelTile.zw ).xyz;
	gel = uGelGrayscale ? gel.rrr : gel;
	transDepth = 1.0 - transDepth;
	transDepth *= transDepth;
	transDepth *= transDepth;

	//done
	OUT_COLOR0.xyz = applyDither(uint2(IN_POSITION.xy), shadow * gel);
	OUT_COLOR0.w = saturate(transDepth * dot(gel, vec3(0.29,0.59,0.12)));
}
