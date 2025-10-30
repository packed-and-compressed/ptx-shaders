#ifndef LIGHT_FRAG
#define LIGHT_FRAG

#include "data/shader/mat/other/lightData.sh"
#include "data/shader/mat/other/lightParams.frag"
#include "data/shader/mat/other/shadowParams.frag"
#include "data/shader/mat/other/ltcCommon.frag"
#include "data/shader/mat/params.frag"

USE_TEXTURE2D(tSceneOcclusion);
uniform vec3	uOcclusionColor;
uniform uint	uOcclusionComposite;

USE_TEXTURE2D(tSceneReflectionMask);

#define	MAX_LIGHTS	64

uniform int uLightShadowCount;

// RT uses sin(SpotAngle) instead of cos(SpotAngle)
#define COS_SPOT_ANGLE( spotSinAngle ) sqrt( max( 0.0f, 1.0f - spotSinAngle * spotSinAngle ) )

LightParams	computeLightParams( uint i, vec3 shadingPos )
{
	LightData data = bLightData[i];
	const bool isPointLight = data.colorFlagsBright.x & LIGHT_FLAG_POINT;
	const bool isSphereLight = data.colorFlagsBright.x & LIGHT_FLAG_SPHERE;

	LightParams p;
	p.toSource.xyz = data.positionTileRadius.xyz;
	p.toSource.w   = isPointLight ? 1.0 : 0.0;
	HINT_FLATTEN if( isPointLight )
	{ p.toSource.xyz -= shadingPos; }
	
	p.invDistance = rsqrt( dot( p.toSource.xyz, p.toSource.xyz ) );
	p.distance = rcp( p.invDistance );
	p.direction = p.toSource.xyz * p.invDistance;

	// attenuation: (note that ?: is more numerically stable than mix() -jdr)
	p.attenuation = p.toSource.w > 0 ? ( p.invDistance * p.invDistance ) : 1.0;

	// area sizes
	uint sizeWH = data.sizeAxisXY.x;
	p.size.y = f16tof32( sizeWH );
	p.size.x = f16tof32( sizeWH >> 16 );
	uint tileRadius = asuint( data.positionTileRadius.w );
	p.size.z = f16tof32( tileRadius );

	// axis
	uint axisXY0 = data.sizeAxisXY.y;
	uint axisXY1 = data.sizeAxisXY.z;
	uint axisZZ = data.sizeAxisXY.w;
	p.axisX.x = f16tof32( axisXY0 );
	p.axisX.y = f16tof32( axisXY0 >> 16 );
	p.axisY.x = f16tof32( axisXY1 );
	p.axisY.y = f16tof32( axisXY1 >> 16 );
	p.axisX.z = f16tof32( axisZZ );
	p.axisY.z = f16tof32( axisZZ >> 16 );
	p.axisZ = normalize( cross( p.axisX, p.axisY ) );

	// color
	uint  colorFlags = data.colorFlagsBright.x;
	float brightness = asfloat( data.colorFlagsBright.y );
	p.color.b = ( ( colorFlags       ) & 0xFF );
	p.color.g = ( ( colorFlags >> 8  ) & 0xFF );
	p.color.r = ( ( colorFlags >> 16 ) & 0xFF );
	p.color *= brightness;

	// spot params
	uint  spotParams = data.spotGelTexture.x;
	float spotSinAngle = f16tof32( spotParams );
	float spotSharpness = f16tof32( spotParams >> 16 );
	p.spotParams.x = COS_SPOT_ANGLE( spotSinAngle );
	p.spotParams.y = spotSharpness;
	p.twoSided = spotSharpness < -0.999f;

	// id
	p.id = float( i );

	// shadow
	p.shadow = vec4( 1.0, 1.0, 1.0, 1.0 );

	if( isSphereLight )
	{
#ifdef SceneHasSphereLights
		//'sphere' area light
		const TangentBasis tbn = createTangentBasis( p.direction );
		p.size.z = ltcClamp( p.size.z, p.distance, p.invDistance );
		// Create local light points
		const vec3 p0 = vec3(-p.size.z, -p.size.z, 0.0);
    	const vec3 p1 = vec3(+p.size.z, -p.size.z, 0.0);
    	const vec3 p2 = vec3(+p.size.z, +p.size.z, 0.0);
    	const vec3 p3 = vec3(-p.size.z, +p.size.z, 0.0);

		// Rotate around origin, then translate to light's location
		p.rect.p0 = p.toSource.xyz + transformVecFrom( tbn, p0 );
		p.rect.p1 = p.toSource.xyz + transformVecFrom( tbn, p1 );
		p.rect.p2 = p.toSource.xyz + transformVecFrom( tbn, p2 );
		p.rect.p3 = p.toSource.xyz + transformVecFrom( tbn, p3 );
		// TODO: @kai, remove this once raster shader param is unified
		p.attenuation = 1.0 / ( PI * p.size.z * p.size.z );
#endif
	}
	else
	{
#ifdef SceneHasRectLights
		//'rectangle' area light
		p.size.x = ltcClamp( p.size.x, p.distance, p.invDistance );
		p.size.y = ltcClamp( p.size.y, p.distance, p.invDistance );
		const float hw = p.size.x; // p.size.x is already half width
		const float hh = p.size.y; // p.size.y is already half height
		const vec3 ex = hw * p.axisX;
    	const vec3 ey = hh * p.axisY;
		p.rect.p0 = p.toSource.xyz - ex - ey;
    	p.rect.p1 = p.toSource.xyz + ex - ey;
    	p.rect.p2 = p.toSource.xyz + ex + ey;
    	p.rect.p3 = p.toSource.xyz - ex + ey;
		// TODO: @kai, remove this once raster shader param is unified
		p.attenuation = 1.0 / ( 4.0 * p.size.x * p.size.y );
#endif
	}

	return p;
}
#undef COS_SPOT_ANGLE

void	MaterialLighting( inout FragmentState s )
{
	//environment / IBL lighting
	#ifdef DiffusionParams
		DiffusionParams diffParams;
	#endif

	#ifdef DiffusionEnv
		#ifdef DiffusionParams
			DiffusionEnv(s, diffParams);
		#else
			DiffusionEnv(s);
		#endif
	#endif
	
	#ifndef ShadowCatcher
		#ifdef ReflectionEnv
			ReflectionEnv(s);
		#endif
		#ifdef ReflectionEnvSecondary
			ReflectionEnvSecondary(s);
		#endif
	#endif

	//occlusion
	#ifdef OcclusionLighting
		OcclusionLighting(s);
	#endif

	vec3 ao;
	{	
		float a = texture2DLod( tSceneOcclusion, s.screenTexCoord, 0.0 ).x;
		ao = (1.0-a)*uOcclusionColor + vec3(a,a,a);
	}
	if( uOcclusionComposite & 1 )
	{ s.diffuseLight *= ao; }

	//dynamic lights
	for( int i = 0; i < uLightCountTotal; ++i )
	{
		//initialize light params
		LightParams p = computeLightParams( i, s.vertexPosition );
		{
			//sample shadow maps
			p.shadow = i < uLightShadowCount ?
						sampleShadowMask( s.screenTexCoord, p.id ) :
						vec4(1.0,1.0,1.0,1.0);
		}

		#ifdef Diffusion
			#ifdef DiffusionParams
				Diffusion(s, p, diffParams);
			#else
				Diffusion(s, p);
			#endif
		#endif

		#ifndef ShadowCatcher
			#ifdef Reflection
				Reflection(s, p);
			#endif
			#ifdef ReflectionSecondary
				ReflectionSecondary(s, p);
			#endif
		#endif
	}

	#ifdef DiffusionFinalize
		#ifdef DiffusionParams
			DiffusionFinalize(s, diffParams);
		#else
			DiffusionFinalize(s);
		#endif
	#endif

	if( uOcclusionComposite & 2 )
	{ s.diffuseLight *= ao; }
	if( uOcclusionComposite & 4 )
	{ s.specularLight *= min(min(ao.x,ao.y),ao.z); }

	//reflection masking
	s.specularLight *= texture2DLod( tSceneReflectionMask, s.screenTexCoord, 0.0 ).x;

	//cavity
	#ifdef CavityLighting
		CavityLighting(s);
	#endif	

	//attenuate emission if under clearcoat
	#ifdef ReflectionFresnelSecondary
	if( s.emissionUnderCoat )
	{
		vec3 Fcoat  = ReflectionFresnelSecondary( s, dot(s.normal, s.vertexEye) );
		s.emission *= oneminus( Fcoat );
	}
	#endif
}
#define	Lighting	MaterialLighting

#endif
