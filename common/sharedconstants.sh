#ifndef MSET_SHAREDCONSTANTS_H
#define MSET_SHAREDCONSTANTS_H

#if defined(CPR_D3D)
#define unsigned uint
#elif defined(CPR_METAL)
#define unsigned uint32_t
#endif

// Only constants shared across host and device code

#if defined(__cplusplus)
namespace mset
{
#endif
    enum HybridRayType : unsigned
    {
        HYBRID_RAY_DIRECT_LIGHT_SHADOW = 0,
        HYBRID_RAY_SSS = 1,
        HYBRID_RAY_INDIRECT = 2,
        HYBRID_RAY_INDIRECT_SSS = 3,
        HYBRID_RAY_INDIRECT_VISIBILITY = 4,
        HYBRID_RAY_TYPE_COUNT = 5,
    };

    // channel output, in hybrid we use a texture array with directlight + diffuse gi + reflection
    // otherwise we would have a single 2d texture and use main pass
	enum HybridOutputChannel
	{
		HYBRID_CHANNEL_MAIN_PASS = 0,           // used for single pass
		HYBRID_CHANNEL_DIRECT_LIGHT = 0,        // used for hybrid lighting
		HYBRID_CHANNEL_DIFFUSE_GI = 1,          // used for hybrid lighting
		HYBRID_CHANNEL_SPECULAR = 2,            // used for hybrid lighting
		HYBRID_CHANNEL_MAX_COUNT
	};
    
    // algorithm passes which are executed separately
	enum HybridShaderPass
	{
        HYBRID_SHADER_PASS_DIRECT = 0,
		HYBRID_SHADER_PASS_DIFFUSE_GI = 1,
		HYBRID_SHADER_PASS_SPECULAR = 2,
		HYBRID_SHADER_PASS_TRANSMISSION = 3,
		HYBRID_SHADER_PASS_COUNT = 4
	};
    
	enum HybridAlbedoChannel
	{
		HYBRID_ALBEDO_DIFFUSE_METALNESS = 0,    // used for diffuse signal for demodulation/modulation
		HYBRID_ALBEDO_SPECULAR_GLOSSINESS = 1,  // used for specular signal for demodulation/modulation
		HYBRID_ALBEDO_REFRACTION = 2,           // used for refraction signal for demodulation/modulation
		HYBRID_ALBEDO_MAX_COUNT
	};
    
    // view modes
    // IMPORTANT: order of entries in use by older Toolbag versions must NOT be changed to ensure backwards compatibility!
    enum ComponentViewMode : unsigned
    {
        // primary modes
        VIEW_MODE_FINAL = 0, // final viewport w/ all postprocessing effects
        VIEW_MODE_DRAFT,	 // minimal render settings
        VIEW_MODE_GRAY,		 // same as marmoset viewer topology mode w/o wireframe
        VIEW_MODE_UNTEXTURED,// absolutely 0 textures, including no normals
        VIEW_MODE_WIREFRAME, // wireframe only (use skybox background)

        // geometry components
        VIEW_MODE_ALPHAMASK,// alpha mask
        VIEW_MODE_DEPTH,	// depth (view space)
        VIEW_MODE_INCIDENCE,// dot(normal, viewangle)
        VIEW_MODE_NORMAL,	// normal (world, view, normalized or not)
        VIEW_MODE_POSITION, // world, view, or object, normalized settings like baker
        VIEW_MODE_VELOCITY, // motion vectors

        // IDs
        VIEW_MODE_MATERIALID,
        VIEW_MODE_OPBJECTID,
        
        // material components
        VIEW_MODE_ALBEDO,
        VIEW_MODE_DISPLACEMENT,
        VIEW_MODE_EMISSIVE,
        VIEW_MODE_GLOSS,
        VIEW_MODE_METALNESS,
        VIEW_MODE_REFLECTIVITY,
        VIEW_MODE_ROUGHNESS,
        VIEW_MODE_TRANSPARENCY,

        // ambient occlusion
        VIEW_MODE_AO,
        
        // lighting components
        VIEW_MODE_LIGHTING_DIRECT,
        VIEW_MODE_LIGHTING_INDIRECT,
        VIEW_MODE_LIGHTING_DIFFUSE,
        VIEW_MODE_LIGHTING_DIRECT_DIFFUSE,
        VIEW_MODE_LIGHTING_INDIRECT_DIFFUSE,
        VIEW_MODE_LIGHTING_SPECULAR,
        VIEW_MODE_LIGHTING_DIRECT_SPECULAR,
        VIEW_MODE_LIGHTING_INDIRECT_SPECULAR,
        
        // spatial hash
        VIEW_MODE_SPATIAL_HASH,
        	
        MAX_VIEW_MODE
    };

    enum ComponentShadingFlags : unsigned
    {
		COMPONENT_USEALBEDO				= 0x01,
		COMPONENT_DIFFUSE				= 0x02,
		COMPONENT_REFLECTION			= 0x04,
		COMPONENT_EMISSION				= 0x08,
		COMPONENT_TRANSMISSION_DIFFUSE	= 0x10,
		COMPONENT_TRANSMISSION_SPECULAR = 0x20,
		COMPONENT_ALL                   = 0xFF,
    };
    
// general helper functions for grouping multiple view modes

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeLightingPass( const unsigned c )
    {
        return c >= VIEW_MODE_LIGHTING_DIRECT && c <= VIEW_MODE_LIGHTING_INDIRECT_SPECULAR;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeDirectLightingPass( const unsigned c )
    {
        return c == VIEW_MODE_LIGHTING_DIRECT || c == VIEW_MODE_LIGHTING_DIRECT_DIFFUSE || c == VIEW_MODE_LIGHTING_DIRECT_SPECULAR;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeIndirectLightingPass( const unsigned c )
    {
        return c == VIEW_MODE_LIGHTING_INDIRECT || c == VIEW_MODE_LIGHTING_INDIRECT_DIFFUSE || c == VIEW_MODE_LIGHTING_INDIRECT_SPECULAR;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeDiffuseLightingPass( const unsigned c )
    {
        return c == VIEW_MODE_LIGHTING_DIFFUSE || c == VIEW_MODE_LIGHTING_DIRECT_DIFFUSE || c == VIEW_MODE_LIGHTING_INDIRECT_DIFFUSE;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeSpecularLightingPass( const unsigned c )
    {
        return c == VIEW_MODE_LIGHTING_SPECULAR || c == VIEW_MODE_LIGHTING_DIRECT_SPECULAR || c == VIEW_MODE_LIGHTING_INDIRECT_SPECULAR;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeLightingPassWithOcclusion( const unsigned c )
    {
        return c == VIEW_MODE_FINAL || c == VIEW_MODE_LIGHTING_INDIRECT || c == VIEW_MODE_LIGHTING_DIFFUSE || c == VIEW_MODE_LIGHTING_INDIRECT_DIFFUSE;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeFullQuality( const unsigned c )
    {
        return c == VIEW_MODE_FINAL || c == VIEW_MODE_AO || isViewModeLightingPass( c ) || c == VIEW_MODE_SPATIAL_HASH;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModePrimary( const unsigned c )
    {
        return c < VIEW_MODE_WIREFRAME;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeGreyscale( const unsigned c )
    {
        return c == VIEW_MODE_GRAY || c == VIEW_MODE_UNTEXTURED;
    }

#if defined(__cplusplus)
    static 
#endif
    bool isViewModeGeometricComponents( const unsigned c )
    {
        return c >= VIEW_MODE_ALPHAMASK && c <= VIEW_MODE_VELOCITY;
    }
    
#if defined(__cplusplus)
    static 
#endif
    bool isViewModeIDComponents( const unsigned c )
    {
        return c >= VIEW_MODE_MATERIALID && c <= VIEW_MODE_OPBJECTID;
    }
    
#if defined(__cplusplus)
    static 
#endif
    bool isViewModeMaterialComponents( const unsigned c )
    {
        return c >= VIEW_MODE_ALBEDO && c <= VIEW_MODE_TRANSPARENCY;
    }
    
#if defined(__cplusplus)
    static 
#endif
    bool isViewModeComponentsOnly( const unsigned c )
    {
        return isViewModeGeometricComponents( c ) ||
            isViewModeIDComponents( c ) ||
            isViewModeMaterialComponents( c );
    }

// general helper functions for determining what needs to be switched off based on view modes

#if defined(__cplusplus)
    static 
#endif
    bool isFogDisabled( const unsigned c )
    {
        return ( c != VIEW_MODE_FINAL ) && ( c != VIEW_MODE_DRAFT );
    }

#if defined(__cplusplus)
    static 
#endif
    bool isDOFDisabled( const unsigned c )
    {
        return ( c != VIEW_MODE_FINAL ) && ( c != VIEW_MODE_AO );
    }
    
#if defined(__cplusplus)
    static 
#endif
    bool isDitheringDisabled( const unsigned c )
    {
        return ( c >= VIEW_MODE_WIREFRAME ) && ( c != VIEW_MODE_AO ) ;
    }
    
#if defined(__cplusplus)
    static 
#endif
    bool isUsingCavity( const unsigned c )
    {
        return c <= VIEW_MODE_GRAY;
    }
    
#if defined(__cplusplus)
    static 
#endif
    bool isUsingOcclusion( const unsigned c )
    {
        return c == VIEW_MODE_FINAL || c == VIEW_MODE_AO || c == VIEW_MODE_GRAY;
    }

#if defined(__cplusplus)
}
#endif

#if defined(CPR_D3D) || defined(CPR_METAL)
#undef unsigned
#endif

#endif
