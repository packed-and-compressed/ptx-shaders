#include "../common/util.sh"
#include "data/shader/mat/other/lightData.sh"

USE_TEXTURE2D(tScreenDepth);

uniform vec4	uScreenScaleBias;
uniform mat4	uUnproject;
uniform mat4	uInvViewMatrix;
uniform float	uFlip;

uniform float	uFogInvDistance;
uniform float   uFogOpacity;
uniform float	uFogDispersion;
uniform vec3	uFogType;
uniform vec3    uFogColor;
uniform float	uFogIllum;

uniform mat4	uLightMatrix;

#ifdef FOG_IBL
	uniform vec4	uFogLightSphere[9];
#else
	uniform vec4	uSpotParams;		// { spotDirX, spotDirY, spotDirZ, cos(spotAngle)^2 }
	uniform int		uLightIdx;
	uniform float	uInvRadius;			// 1 / radius (or 'effective radius')
	#ifdef FOG_SHADOWS
		USE_TEXTURE2DARRAY( tShadowMap );
		uniform float		uShadowLayer;
		uniform mat4		uShadowMatrix;
		uniform mat4		uShadowProjection;
		uniform float		uDitherOffset;
		uniform vec4		uCylinder;	//x,y,z r^2
	#endif

	vec3	lightColor(const uint2 colorFlagsBrightness)
	{
		const float brightness = uLightIdx >= 0 ? asfloat( colorFlagsBrightness.y ) : 0.0f;
		const vec3	color = vec3( 
			( ( colorFlagsBrightness.x >> 16 ) & 0xFF ), 
			( ( colorFlagsBrightness.x >> 8 ) & 0xFF ), 
			( ( colorFlagsBrightness.x ) & 0xFF ) ) * brightness;
		return color;
	}
#endif

float	fog( float dist )
{
	dist *= uFogInvDistance;
	float f =	uFogType.x * min(dist,1.0) + //linear
				(uFogType.y - uFogType.y*rcp(1.0 + 16.0*dist*dist)) + //inv square
				(uFogType.z - uFogType.z*exp(-3.0 * dist)); //exponential
	return f * uFogOpacity;
}

#ifdef FOG_SHADOWS
	float	sampleShadow( vec3 worldPos )
	{
		vec3 spos = mulPoint( uShadowMatrix, worldPos ).xyz;
		vec2 tc;

		#ifdef FOG_OMNI
			//octahedral layout
			vec3 dir = spos;
			dir /= dot( vec3(1.0,1.0,1.0), abs(dir) );
			vec2 rev = abs(dir.zx) - vec2(1.0,1.0);
			vec2 neg = vec2(	dir.x < 0.0 ? rev.x : -rev.x,
								dir.z < 0.0 ? rev.y : -rev.y );
			tc = (dir.y < 0.0) ? neg : dir.xz;
			tc = 0.5*tc + vec2(0.5,0.5);
		#else
			//2d layout
			spos.z = min(spos.z,0.0);
			vec4 sprj = mulPoint( uShadowProjection, spos );
			tc = 0.5*(sprj.xy / sprj.w) + vec2(0.5,0.5);
		#endif
		float dist = texture2DArrayLod( tShadowMap, vec3( tc.x, tc.y, uShadowLayer ), 0.0 ).x;
		return dot(spos,spos) < dist*dist ? 1.0 : 0.0;
	}

	float	dither( vec2 seed )
	{
		return fract(sin(dot(seed, vec2(12.9898,78.233))) * 43758.5453 + uDitherOffset);
	}

	void	rayCylinder( vec3 rayOrigin, vec3 rayDir,
						 out float tMin, out float tMax	)
	{
		//intersects ray with infinite cylinder formed by scene + light direction
		vec3 v = uSpotParams.xyz, p = uCylinder.xyz;
		vec3 tmp0 = rayDir - dot(rayDir,v)*v;
		vec3 tmp1 = (rayOrigin - p) - dot(rayOrigin - p,v)*v;

		float a = dot(tmp0,tmp0);
		float b = 2.0 * dot(tmp0,tmp1);
		float c = dot(tmp1,tmp1) - uCylinder.w;

		float root = b*b - 4.0*a*c;
		if( root >= 0.0 )
		{
			//found intersection(s)
			root = sqrt(root);
			tMin = (-b - root) / (2.0 * a);
			tMax = (-b + root) / (2.0 * a);
		}
		else
		{ tMin = tMax = 0.0; }
	}
#endif

BEGIN_PARAMS
    INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//perpsective check
	bool isPerspective = abs( col2( uUnproject ).z ) <= 0.0;

	//sample depth buffer
	vec3 endPos, worldEye;
	{
		vec2 screenCoord = IN_POSITION.xy * uScreenScaleBias.xy + uScreenScaleBias.zw;
		
		#ifdef RENDERTARGET_Y_DOWN
			vec2 ndcCoord = vec2( 2.0,-2.0 ) * ( screenCoord - vec2( 0.5, 0.5 ) );
		#else
			vec2 ndcCoord = vec2( 2.0, 2.0 ) * ( screenCoord -  vec2( 0.5, 0.5 ) );
		#endif

		//reconstruct 3D position (in camera view space) from depth value

		float viewDepth = texture2D( tScreenDepth, screenCoord ).x;
		float clipDepth = 1.0;

		if( isPerspective ) { clipDepth = viewDepth; }
		endPos = mulPoint( uUnproject, vec3( ndcCoord, 1.0 ) ).xyz * clipDepth;
		endPos.z = viewDepth;
		endPos.xy *= uFlip;
		endPos = mulPoint( uInvViewMatrix, endPos ).xyz;

		worldEye = -col2( uInvViewMatrix ).xyz;
		if( isPerspective )
		{
			worldEye.xy = mulPoint( uUnproject, vec3( ndcCoord, 1.0 ) ).xy;
			worldEye.xy *= uFlip;
			worldEye.z = 1.0;
			worldEye = mulVec( uInvViewMatrix, -worldEye ).xyz;
		}
		worldEye = normalize( worldEye );
	}
	vec3 startPos = col3( uInvViewMatrix ).xyz;

	vec3 color = uFogColor;

	#if defined(FOG_IBL)

		//use SH-encoded image-based lighting
		//diffusion is done cpu-side to the SH coefficients
		vec3 d = mulVec( uLightMatrix, worldEye );

		vec3 lighting = uFogLightSphere[0].xyz;
		lighting += uFogLightSphere[1].xyz * d.y;
		lighting += uFogLightSphere[2].xyz * d.z;
		lighting += uFogLightSphere[3].xyz * d.x;
		vec3 swz = d.yyz * d.xzx;
		lighting += uFogLightSphere[4].xyz * swz.x;
		lighting += uFogLightSphere[5].xyz * swz.y;
		lighting += uFogLightSphere[7].xyz * swz.z;
		vec3 sqr = d * d;
		lighting += uFogLightSphere[6].xyz * ( 3.0*sqr.z - 1.0 );
		lighting += uFogLightSphere[8].xyz * ( sqr.x - sqr.y );

		color = mix( color, color*lighting, uFogIllum );

		float f = fog( length( endPos - startPos ) );
		OUT_COLOR0.xyz = color * f;
		OUT_COLOR0.w = f;
		return;

	#else
		#if defined(FOG_SPOT) || defined(FOG_OMNI)
			// get light data for this fog pass
			const LightData lightData = bLightData[uLightIdx];

			//sphere intersection
			float t0 = 0.0, t1 = 0.0;
			{
				float r = 1.0/( uInvRadius );
				float a = 1.0;
				float b = 2.0 * dot( worldEye, startPos - lightData.positionTileRadius.xyz );
				float c =	dot( lightData.positionTileRadius.xyz, lightData.positionTileRadius.xyz ) +
							dot( startPos, startPos ) +
							-2.0 * dot( lightData.positionTileRadius.xyz, startPos ) +
							- r*r;
				float root = b*b - 4.0*a*c;
				if( root >= 0.0 )
				{
					//found intersection(s)
					root = sqrt(root);
					t0 = (-b - root) / (2.0 * a);
					t1 = (-b + root) / (2.0 * a);
				}
			}

			#if defined(FOG_SPOT)
			{
				//cone intersection
				float cos2 = uSpotParams.w, sin2 = 1.0 - cos2;

				vec3 v = worldEye; vec3 va = uSpotParams.xyz;
				vec3  dp = startPos - lightData.positionTileRadius.xyz;

				vec3 tmp = v-dot(v,va)*va, tmp2 = dp-dot(dp,va)*va;
				float a = cos2*dot(tmp,tmp) - sin2*dot(v,va)*dot(v,va);
				float b = 2.0*cos2*dot(tmp,tmp2) - 2.0*sin2*dot(v,va)*dot(dp,va);
				float c = cos2*dot(tmp2,tmp2) - sin2*dot(dp,va)*dot(dp,va);
				float root = b*b - 4.0*a*c;
				if( root >= 0.0 )
				{
					//found intersection(s)
					float c0 = (-b - sqrt(root)) / (2.0 * a);
					float c1 = (-b + sqrt(root)) / (2.0 * a);
					if( c1 < c0 )
					{ float tmp = c0; c0 = c1; c1 = tmp; } //ensures s0 < s1, may not be needed

					//clip behind light source
					bool c0behind = dot( -lightData.positionTileRadius.xyz + startPos + worldEye * c0, uSpotParams.xyz ) <= 0.0;
					bool c1behind = dot( -lightData.positionTileRadius.xyz + startPos + worldEye * c1, uSpotParams.xyz ) <= 0.0;
					if( !c0behind || !c1behind )
					{
						if( c0behind )
						{ c0 = c1; c1 = t1; }
						else if( c1behind )
						{ c1 = c0; c0 = t0; }

						//clip to sphere
						t0 = max( t0, c0 );
						t1 = min( t1, c1 );
					}
					else
					{
						//both intersections behind light source
						t1 = t0 = 0.0;
					}
				}
				else
				{
					//no intersection with conic
					t1 = t0 = 0.0;
				}
			}
			#endif

			//view and depth clamp
			float tx = dot( worldEye, endPos - startPos );
			t0 = clamp( t0, 0.0, tx );
			t1 = clamp( t1, 0.0, tx );

			//step through intersection points
			float hit = 0.0;
			if( t1 > t0 )
			{
				#ifdef FOG_SHADOWS
					#define SAMPLES 32
					float stepDither = dither(fCoord.xy) * (t1-t0)/float(SAMPLES-2);
				#else
					#define SAMPLES 8
					float stepDither = 0.0;
				#endif
				for( int i=0; i<SAMPLES; ++i )
				{
					float t = t0 + (t1-t0) * float(i)/float(SAMPLES-1);
					vec3 p = startPos + (t+stepDither) * worldEye;
					vec3  lightToPoint = p - lightData.positionTileRadius.xyz;
					float a = rcp( dot(lightToPoint,lightToPoint) );
					#ifdef FOG_SHADOWS
						a *= sampleShadow( p );
					#endif
					hit += a - a * fog( t ); //block contribution with distance
				}
				hit *= 1.0/float(SAMPLES);
				hit *= fog( t1 - t0 ); //this much fog catches the light
			}
			color *= hit * uFogIllum * lightColor( lightData.colorFlagsBright );

		#elif defined(FOG_DIR)
			// get light data for this fog pass
			const LightData lightData = bLightData[uLightIdx];
			//direct light
			float f = fog( dot( worldEye, endPos - startPos ) );
			#ifdef FOG_SHADOWS
				float t0, t1;
				rayCylinder( startPos, worldEye, t0, t1 );
	
				//view and depth clamp
				float tx = dot( worldEye, endPos - startPos );
				t0 = clamp( t0, 0.0, tx );
				t1 = clamp( t1, 0.0, tx );
	
				if( t1 > t0 )
				{
					#define SAMPLES 32
					float hit = 0.0;
					float stepDither = dither(fCoord.xy) * (t1-t0)/float(SAMPLES-2);
					float tincr = (t1-t0) * (1.0/float(SAMPLES));
					for( int i=0; i<SAMPLES; ++i )
					{
						float t = t0 + float(i)*tincr + stepDither;
						vec3 p = startPos + t * worldEye;
						float s = sampleShadow( p );
						f -= (1.0 - s) * (fog(t+tincr)-fog(t));
					}
				}
			#endif

			float disp = 0.5 + 0.5*dot( worldEye, -uSpotParams.xyz );
			disp = 1.0 + uFogDispersion*(2.0*disp*disp-1.0);
			color *= (0.1 * f) * (disp * uFogIllum) * lightColor(lightData.colorFlagsBright);

		#endif

		OUT_COLOR0.xyz = color;
		OUT_COLOR0.w = 0.0;

	#endif
}
