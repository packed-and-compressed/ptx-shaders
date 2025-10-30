#include "data/shader/common/sharedconstants.sh"
#include "data/shader/common/util.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/bake/dither.frag"

uniform int uComponentMode;

#if defined(MATERIAL_PASS_COMPONENTVIEW)
uniform int		uComponentData;
uniform vec4	uComponentScalar0;
uniform vec4	uComponentScalar1;
uniform mat4	uComponentMat;
#endif

//utils
vec3 colorFromID( float id )
{
	float hue = frac( id * 0.618033988749895 );

	//hsv -> rgb color
	vec3 color;
	float v = 1.0, s = 1.0;
	float c = v * s;
	float h = mod( hue * 6.0, 6.0 );
	float x = c * ( 1.0 - abs( mod( h, 2.0 ) - 1.0) );

	HINT_FLATTEN
	if( h < 1.0 )
	{ color = vec3(c, x, 0.0); }
	
	else if( h < 2.0 )
	{ color = vec3(x, c, 0.0); }

	else if( h < 3.0 )
	{ color = vec3(0.0, c, x); }

	else if( h < 4.0 )
	{ color = vec3(0.0, x, c); }
	
	else if( h < 5.0 )
	{ color = vec3(x, 0.0, c); }

	else //if( h < 6.0 )
	{ color = vec3(c, 0.0, x); }

	return color;
}

//=============================================================

//Displacement
#undef  DisplacementMerge
#define DisplacementMerge			ComponentViewDisplacementMerge

void ComponentViewDisplacementMerge( in MaterialState m, inout FragmentState s )
{
    s.displacement = m.displacement;
}

//=============================================================

//Surface
#undef  SurfaceMerge
#define SurfaceMerge				ComponentViewSurfaceMerge

void ComponentViewSurfaceMerge( in MaterialState m, inout FragmentState s )
{
	#ifdef SurfaceMergeFunction
		SurfaceMergeFunction(m, s);
	#endif
	
    if( uComponentMode == VIEW_MODE_UNTEXTURED )
    {
        s.normal = s.vertexNormal;
    }
}

//=============================================================

//Albedo
#undef	AlbedoMerge
#define AlbedoMerge					ComponentViewAlbedoMerge

void	ComponentViewAlbedoMerge( in MaterialState m, inout FragmentState s )
{
	#ifdef AlbedoMergeFunction
		AlbedoMergeFunction(m, s);
	#endif	
	
    if( isViewModeGreyscale( uComponentMode ) )
    {
        s.albedo.rgb = vec3( 0.5, 0.5, 0.5 );
        s.albedo.a = 1.0;
    }
}

//=============================================================

//Reflectivity
#undef	ReflectivityMerge
#define ReflectivityMerge				ComponentViewReflectivityMerge

void	ComponentViewReflectivityMerge( in MaterialState m, inout FragmentState s )
{
	HINT_BRANCH
	if( isViewModeGreyscale( uComponentMode ) )
	{
        s.reflectivity = vec3( .04, .04, .04 );
        s.reflectivitySecondary = vec3( 0.0, 0.0, 0.0 );
        s.metalness = 0.0;
    }
	else if( uComponentMode == VIEW_MODE_ALBEDO && uComponentData == VIEW_MODE_DRAFT )
	{
		#ifdef ReflectivityMergeFunction
			ReflectivityMergeFunction( m, s );
		#endif
    }
	else if( uComponentMode == VIEW_MODE_METALNESS || uComponentMode == VIEW_MODE_REFLECTIVITY )
	{
		#ifdef ReflectivityMergeFunction
			ReflectivityMergeFunction( m, s );
		#endif
	}	
}

//=============================================================
		
//Transmission
void	ComponentViewTransmission( inout FragmentState s )
{
	HINT_BRANCH
	if( isViewModeGreyscale( uComponentMode ) )
	{
		s.transmissivity = vec3(0.0,0.0,0.0);
	}
	else if( uComponentMode == VIEW_MODE_FINAL || uComponentMode == VIEW_MODE_DRAFT || uComponentMode == VIEW_MODE_TRANSPARENCY )
	{
		#ifdef Transmission
			Transmission( s );
		#endif
	}
}
#ifdef Transmission
	#undef Transmission
#endif
#define Transmission ComponentViewTransmission


//=============================================================
		
//Transmissivity
#undef	TransmissivityMerge
#define TransmissivityMerge					ComponentViewTransmissivityMerge

void	ComponentViewTransmissivityMerge( in MaterialState m, inout FragmentState s )
{
	HINT_BRANCH
	if( uComponentMode == VIEW_MODE_GRAY || uComponentMode == VIEW_MODE_UNTEXTURED )
	{
        s.transmissivity = vec3( 0.0, 0.0, 0.0 );
    }
	else if( uComponentMode == VIEW_MODE_FINAL || 
			 uComponentMode == VIEW_MODE_DRAFT || 
			 uComponentMode == VIEW_MODE_TRANSPARENCY )
	{
		#ifdef TransmissivityMergeFunction
			TransmissivityMergeFunction( m, s );
		#endif
	}
}

//=============================================================
		
//Occlusion/Cavity
#undef	OcclusionMerge
#undef	OcclusionLighting
#define	OcclusionMerge					ComponentViewOcclusionMerge
#define	OcclusionLighting				ComponentViewOcclusionLighting

void ComponentViewOcclusionMerge( in MaterialState m, inout FragmentState s )
{
	#ifdef OcclusionMergeFunction
	if( isUsingOcclusion( uComponentMode ) )
	{
		OcclusionMergeFunction( m, s );
	}
	else
	{
		s.occlusion = 1.0;
	}
	#endif	
}

void	ComponentViewOcclusionLighting( inout FragmentState s )
{
	#ifdef OcclusionLightingFunction
	if( isUsingOcclusion( uComponentMode ) )
	{
		OcclusionLightingFunction( s );
	}
	#endif
}

#undef	CavityMerge
#undef	CavityLighting
#define	CavityMerge					ComponentViewCavityMerge
#define	CavityLighting				ComponentViewCavityLighting

void	ComponentViewCavityMerge( in MaterialState m, inout FragmentState s )
{
	#ifdef CavityMergeFunction
	if( isUsingCavity( uComponentMode ) )
	{
		CavityMergeFunction( m, s );
	}
	else
	{
		s.cavity = 1.0;
	    s.cavityDiffuse = 1.0;
		s.cavitySpecular = 1.0;
	}
	#endif
}

void	ComponentViewCavityLighting( inout FragmentState s )
{
	#ifdef CavityLightingFunction
	if( isUsingCavity( uComponentMode ) )
	{
		CavityLightingFunction( s );
	}
	#endif
}

//=============================================================
		
//Microsurface
#undef  MicrosurfaceMerge
#define MicrosurfaceMerge				ComponentViewMicrosurfaceMerge

void	ComponentViewMicrosurfaceMerge( in MaterialState m, inout FragmentState s )
{
	#ifdef MicrosurfaceMergeFunction
		MicrosurfaceMergeFunction(m, s);
	#endif

	HINT_BRANCH
	if( isViewModeGreyscale( uComponentMode ) )
	{
        s.gloss = 0.75;
    }
}

//=============================================================

//Emissive
#undef	EmissiveMerge
#define	EmissiveMerge				ComponentViewEmissiveMerge

void ComponentViewEmissiveMerge( in MaterialState m, inout FragmentState s )
{
	HINT_BRANCH
	if( uComponentMode == VIEW_MODE_EMISSIVE || uComponentMode == VIEW_MODE_ALPHAMASK )
	{
	#ifdef EmissiveMergeFunction
		EmissiveMergeFunction( m, s );
	#endif
	}
}

//=============================================================

//Transparency
#undef	TransparencyMerge
#undef 	TransparencyLighting
#define	TransparencyMerge			ComponentViewTransparencyMerge
#define	TransparencyLighting		ComponentViewTransparencyLighting
	
void	ComponentViewTransparencyMerge( in MaterialState m, inout FragmentState s )
{
	if( uComponentMode != VIEW_MODE_UNTEXTURED && uComponentMode != VIEW_MODE_TRANSPARENCY )
	{
	#ifdef TransparencyMergeFunction
		TransparencyMergeFunction( m, s );
	#endif
	}
}

void	ComponentViewTransparencyLighting( inout FragmentState s )
{
	if( uComponentMode == VIEW_MODE_UNTEXTURED || uComponentMode == VIEW_MODE_TRANSPARENCY )
	{
	#ifdef TransparencyLightingFunction
		TransparencyLightingAlpha( s );
	#endif
	}
	else
	{
	#ifdef TransparencyLightingFunction
		TransparencyLightingFunction( s );
	#endif
	}	
}

//=============================================================

#include "data/shader/mat/light.frag"

//Output
#if defined(MATERIAL_PASS_COMPONENTVIEW)

void	ComponentViewOutput( inout FragmentState s )
{
	//basic lighting
	s.output0.rgb =	min( s.diffuseLight + s.specularLight + s.emission, FLT_MAX );
	s.output0.a   = 1.0;
	
	if( uComponentMode == VIEW_MODE_WIREFRAME )// wireframe
	{
		s.output0.rgba = vec4( 0.0, 0.0, 0.0, 0.0 );
	}
	else if( uComponentMode == VIEW_MODE_ALPHAMASK )// alpha mask
	{
		s.output0.xyz = 1.0;
		#ifdef LightMerge_AlphaOut
			s.output0 = s.albedo.aaaa;
		#endif
	}
	else if( uComponentMode == VIEW_MODE_DEPTH )// depth
	{
		float depth = mulVec( uComponentMat, s.vertexPosition ).z;

		//view depth
		if( uComponentData == 0 )
		{
			//bounding sphere
			if( uComponentScalar0.y - uComponentScalar0.x > 0.0 )
			{
				float mn = uComponentScalar0.x;
				float mx = uComponentScalar0.y;
				float r = uComponentScalar0.z;
				mn = sign( mn ) * r;
				mx = sign( mx ) * r;

				depth = ( depth - mn ) / ( mx - mn );
			}
		}
		else if( uComponentData == 1 )
		{
			//bounding box
			if( uComponentScalar0.y - uComponentScalar0.x > 0.0 )
			{
				float mn = uComponentScalar0.x;
				float mx = uComponentScalar0.y;
				float r = uComponentScalar0.z;

				depth = ( depth - mn ) / ( mx - mn );
			}
		}
		else
		{
			depth = 1.0 - s.vertexEyeDistance;
		}

		if( uComponentScalar0.w > 0.0 )
		{
			depth = dither8bit( vec3( depth, depth, depth ), s.screenCoord ).x;
		}

		s.output0.xyz = vec3( depth, depth, depth );
	}
	else if( uComponentMode == VIEW_MODE_INCIDENCE )// incidence; normal dot view
	{
		float incidence = dot( s.normal, s.vertexEye );
		s.output0.xyz = 0.5 * vec3( incidence, incidence, incidence ) + vec3( 0.5, 0.5, 0.5 );
	}
	else if( uComponentMode == VIEW_MODE_NORMAL )// normal
	{
		//object
		vec3 n = s.normal;
		n *= uComponentScalar0.xyz;
		n = 0.5 * n + vec3( 0.5, 0.5, 0.5 );

		//tangent
		if( uComponentData == 1 )
		{
			float xx = dot( s.normal, s.vertexTangent );
			float yy = dot( s.normal, s.vertexBitangent );
			float zz = dot( s.normal, s.vertexNormal );
			n = normalize( vec3( xx, yy, zz ) );
			n *= uComponentScalar0.xyz;
			n = 0.5 * n + vec3( 0.5, 0.5, 0.5 );
		}
		//view
		if( uComponentData == 2 )
		{
			n = mulVec( uComponentMat, s.normal );
			n *= uComponentScalar0.xyz;
			n = 0.5 * n + vec3( 0.5, 0.5, 0.0 );
			n.z = 0.0;
		}
		
		s.output0.xyz = n;
	}
	else if( uComponentMode == VIEW_MODE_POSITION )// position
	{	

		vec3 p = s.vertexPosition.xyz;
		//max - min
		vec3 boxDimensions = uComponentScalar1.xyz - uComponentScalar0.xyz;
		//bounding sphere
		if( uComponentData == 0 )
		{
			float boxMaxDimension = max( boxDimensions.x, max( boxDimensions.y, boxDimensions.z ) );
			vec3 stretch = boxDimensions /  boxMaxDimension;
			vec3 stretchBounds = ( 1.0 - stretch ) / 2.0;

			p -= uComponentScalar0.xyz;
			p /= boxDimensions;

			p *= stretch;
			p += stretchBounds;
		}
		//bounding box
		if( uComponentData == 1 )
		{
			p -= uComponentScalar0.xyz;
			p /= boxDimensions;
		}
		
		if( uComponentScalar0.w > 0.0 )
		{ p = dither8bit( p, s.screenCoord ); }
		
		s.output0.xyz = p;
	}
	else if( uComponentMode == VIEW_MODE_MATERIALID )
	{
		//material id
		s.output0.xyz = colorFromID( mod( float( uComponentData ), 1024.0 ) );
	}
	else if( uComponentMode == VIEW_MODE_OPBJECTID )
	{		
		//object id
		s.output0.xyz = colorFromID( mod( float( uComponentData ), 1024.0 ) );
	}
	else if( uComponentMode == VIEW_MODE_ALBEDO )
	{
		//albedo
		vec3 albedo = s.albedo.xyz;
		s.output0.xyz = albedo;
	}
	else if( uComponentMode == VIEW_MODE_EMISSIVE )
	{
		//emissive
		s.output0.xyz = s.emission;
	}
	else if( uComponentMode == VIEW_MODE_GLOSS )
	{
		//gloss
		s.output0.xyz = vec3(s.gloss, s.gloss, s.gloss);
	}
	else if( uComponentMode == VIEW_MODE_METALNESS )
	{
		//metalness
		s.output0.xyz = vec3( s.metalness, s.metalness, s.metalness );
	}
	else if( uComponentMode == VIEW_MODE_REFLECTIVITY )
	{
		//reflectivity
		s.output0.xyz = s.reflectivity.rgb;
	}
	else if( uComponentMode == VIEW_MODE_ROUGHNESS )
	{
		//roughness
		s.output0.xyz = vec3(1.0 - s.gloss, 1.0 - s.gloss, 1.0 - s.gloss);
	}
	else if( uComponentMode == VIEW_MODE_TRANSPARENCY )
	{
		//transparency
		s.output0.xyz = s.albedo.aaa;
		s.output0.w = 1.0;
	}
	else if( uComponentMode == VIEW_MODE_DISPLACEMENT )
	{
		#ifdef DISPLACEMENT_VECTOR_OUTPUT
			s.output0.xyz = 0.5 * uComponentScalar0.x * s.displacement + vec3( 0.5, 0.5, 0.5 );
		#else
			s.output0.xyz = uComponentScalar0.x * ( s.displacement - 0.5 ) + 0.5;
		#endif
	}

	//alpha cutout:
	s.output0.a = s.albedo.a;
}
#define Output	ComponentViewOutput

#endif

