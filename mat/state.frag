#ifndef MSET_FRAGMENT_STATE_H
#define MSET_FRAGMENT_STATE_H

#include "sampleCoord.sh"
#include "../common/util.sh"
#include "../common/differential.sh"
#include "../common/rng.comp"

struct HairState
{
	vec3 	hairDirection;
	vec3 	hairSigmaA;
	int 	hairType;
	float 	hairBetaM;
	float 	hairBetaN;
	vec4	hairV;
	float 	hairS;
	vec3	hairSin2kAlpha;
	vec3	hairCos2kAlpha;
};

struct	MaterialState
{
	//texcoord
    SampleCoord			vertexTexCoord;						//blend: no(contextual)
	
	//albedo
	vec4				albedo;								//blend: yes				reads: transmission

	//surface
	vec3				normal;								//blend: yes				
	bool				normalAdjust;						//blend: special(or)		

	//microsurface
	float				glossOrRoughness;					//blend: yes				reads: transmission			discriminatingField: glossFromRoughness
	float				glossOrRoughnessSecondary;			//blend: yes											discriminatingField: glossFromRoughnessSecondary
	bool				glossFromRoughness;					//blend: no(contextual)		reads: transmission
	bool				glossFromRoughnessSecondary;		//blend: no(contextual)
	float				horizonSmoothing;					//blend: no(base layer)

	//reflectivity
	float				metalness;							//blend: yes				
	vec3				specular;							//blend: yes				reads: transmission
	vec3				specularSecondary;					//blend: yes				
	bool				specularConserve;					//blend: no(contextual)		
	bool				specularConserveSecondary;			//blend: no(contextual)		
	vec3				fresnel;							//blend: yes				
	vec3				fresnelSecondary;					//blend: yes				

	//transmission
	float				transmission;						//blend: yes				
    bool				normalStrict;						//blend: no(base layer)		
	vec3				refractionColor;					//blend: yes				
	vec4				refractionDepth;					//blend: yes				
	float				refractionGlossOrRoughness;			//blend: yes											discriminatingField: glossFromRoughness
	float				refractionF0;						//blend: yes				
	float				refractionThickness;				//blend: yes				
	float				refractionSquash;					//blend: yes				
	vec3				scatterColor;						//blend: yes				
	vec3				scatterDepth;						//blend: yes				
	float				scatterAniso;						//blend: yes				
	vec3				scatterTranslucency;				//blend: yes				
	vec3				fuzz;								//blend: yes				
	bool				fuzzGlossMask;						//blend: no(base layer)		
	vec3				thinTranslucency;					//blend: yes				
	float				thinScatter;						//blend: yes				

	//diffusion
	vec3				sheen;								//blend: yes				
    float				sheenTint;							//blend: yes
    float				sheenGlossOrRoughnes;				//blend: yes											discriminatingField: sheenRoughnessFromGloss
	bool				sheenRoughnessFromGloss;			//blend: no(contextual)		

	//reflection
	vec3				anisoDirection;						//blend: yes				
	vec3				anisoDirectionSecondary;			//blend: yes				
	float				anisoAspect;						//blend: yes				
	float				anisoAspectSecondary;				//blend: yes				

	//emission
	vec3				emission;							//blend: yes				
	bool				emissionUnderCoat;					//blend: no(base layer)

	//displacement
	vec3				displacement;						//blend: yes
	vec2				displacementMeshScaleBias;			//blend: no(base layer)		
	
	//glints
    float				glintIntensity;						//blend: yes				
    float				glintGlossOrRoughness;				//blend: yes											discriminatingField: glintRoughnessFromGloss
    bool				glintRoughnessFromGloss;			//blend: no
	bool				glintUseMicrosurface;				//blend: no(base layer)		
    float				glintDensity;						//blend: yes				
    float				glintDistance;						//blend: no(base layer)		
    float				glintScale;							//blend: yes				
    float				glintExtent;						//blend: no(base layer)		
	
	//newton's rings
    float				newtonsRingsThickness;				//blend: yes				
    float				newtonsRingsIntensity;				//blend: yes				

	//hair inputs
    vec3				hairAlbedo;							//blend: yes
    vec3				hairTint;							//blend: yes
	float				hairRadialRoughness;				//blend: yes
	float				hairRadialRoughnessSecondary;		//blend: yes
	vec3				hairDirection;						//blend: yes
	vec3				hairDirectionSecondary;				//blend: yes
    int					hairType;							//blend: no(base layer)
	int					hairTypeSecondary;					//blend: no(base layer)
    vec3				hairSin2kAlpha;						//blend: no(base layer)
    vec3				hairSin2kAlphaSecondary;			//blend: no(base layer)
    vec3				hairCos2kAlpha;						//blend: no(base layer)
    vec3				hairCos2kAlphaSecondary;			//blend: no(base layer)
	
	//hair precompute data
    HairState			hairState;							//blend: yes
    HairState			hairStateSecondary;					//blend: yes
	
	//occlusion
    float				occlusion;							//blend: yes				
    float				cavity;								//blend: yes				
    float				cavityDiffuse;						//blend: yes				
    float				cavitySpecular;						//blend: yes				
};

MaterialState newMaterialState()
{
	MaterialState m;
	
	//texcoord
    m.vertexTexCoord = newSampleCoord();
	
	//albedo
	m.albedo = vec4(1.0, 1.0, 1.0, 1.0);
	
	//surface
	m.normal = vec3(0.0, 0.0, 0.0);
	m.normalAdjust = false;

	//microsurface
    m.glossOrRoughness = 0.0;
    m.glossOrRoughnessSecondary = 0.0;
	m.glossFromRoughness = false;
	m.glossFromRoughnessSecondary = false;
    m.horizonSmoothing = 0.0;
	
	//reflectivity
	m.metalness = 0.0;
	m.specular = vec3(0.0, 0.0, 0.0);
	m.specularSecondary = vec3(0.0, 0.0, 0.0);
	m.specularConserve = false;
	m.specularConserveSecondary = false;
	m.fresnel = vec3(0.0, 0.0, 0.0);
	m.fresnelSecondary = vec3(0.0, 0.0, 0.0);

	//transmission
	m.transmission = 0.0;
	m.normalStrict = false;
	m.refractionColor = m.albedo.rgb;
	m.refractionDepth = vec4(0.0, 0.0, 0.0, 0.0);
    m.refractionGlossOrRoughness = 0.0;
	m.refractionF0 = 0.0;
	m.refractionThickness = 0.0;
	m.refractionSquash = 0.0;
	m.scatterColor = m.albedo.rgb;
	m.scatterDepth = vec3(0.0, 0.0, 0.0);
	m.scatterAniso = 0.0;
	m.scatterTranslucency = vec3(0.0, 0.0, 0.0);
	m.fuzz = vec3(0.0, 0.0, 0.0);
	m.fuzzGlossMask = false;
	m.thinTranslucency = m.albedo.rgb;
	m.thinScatter = 0.0;

	//diffusion
	m.sheen = vec3(0.0, 0.0, 0.0);
    m.sheenTint = 0.0;
    m.sheenGlossOrRoughnes = 0.0;
    m.sheenRoughnessFromGloss = false;

	//reflection
	m.anisoDirection = vec3(0.0, 0.0, 0.0);
	m.anisoDirectionSecondary = vec3(0.0, 0.0, 0.0);
	m.anisoAspect = 1.0;
	m.anisoAspectSecondary = 1.0;

	//emission
	m.emission = vec3(0.0, 0.0, 0.0);
	m.emissionUnderCoat = false;

	//displacement
	m.displacement = vec3(0.0, 0.0, 0.0);
    m.displacementMeshScaleBias = vec2( 1.0, 0.0 );

	//glints
    m.glintIntensity = 0.0;
    m.glintGlossOrRoughness = 0.0;
    m.glintRoughnessFromGloss = false;
    m.glintUseMicrosurface = false;
    m.glintDensity = 0.0;
    m.glintDistance = 0.0;
    m.glintScale = 0.0;
    m.glintExtent = 0.0;
	
	//newton's rings
    m.newtonsRingsThickness = 0.0;
    m.newtonsRingsIntensity = 0.0;
	
	//hair inputs
    m.hairAlbedo = vec3( 0.0, 0.0, 0.0 );
    m.hairTint = vec3( 1.0, 1.0, 1.0 );
    m.hairRadialRoughness = 1.0;
    m.hairRadialRoughnessSecondary = 1.0;
    m.hairDirection = vec3( 0.5, 0.0, 0.5 );
    m.hairDirectionSecondary = vec3( 0.5, 0.0, 0.5 );
    m.hairType = 0;
    m.hairSin2kAlpha = vec3( 0.0, 0.0, 0.0 );
    m.hairCos2kAlpha = vec3( 0.0, 0.0, 0.0 );
	
	//raster, painting & hybrid
    m.occlusion = 1.0;
    m.cavity = 1.0;
    m.cavityDiffuse = 1.0;
    m.cavitySpecular = 1.0;
	
	return m;
}

struct	FragmentState
{
	//inputs
	precise vec3		vertexPosition;
	vec3				vertexVelocity; //3D velocity vector
	vec2				vertexMotionNDC; //2D NDC motion vector
	vec3				vertexEye;
	float				vertexEyeDistance;
	vec4				vertexColor;
	vec3				vertexNormal;
	vec3				vertexTangent;
	vec3				vertexBitangent;
	vec3				geometricNormal;
	vec3				triangleBarycentrics;
	vec3				triplanarPosition;
	vec3				triplanarNormal;
	float				normalAdjust;
	bool				normalStrict;
	uint2				screenCoord;
	vec2				screenTexCoord;
	float				screenDepth;
	uint				sampleCoverage;
	uint				objectID;
	uint				primitiveID;
	bool				frontFacing;

	SampleCoord			vertexTexCoord;
	vec4				vertexTexCoordBase;
	vec4 				vertexTexCoordSecondary;
	
	//transform
	mat3x4				transform;
	mat3x4				transformInverse;
	mat3x3				transformInverseTranspose;

	//state
	vec4				albedo;
	vec3				baseColor;
	vec3				normal;
	vec3				displacement;
	float				gloss;
	float				glossSecondary;
	float				glossTransmission;
	vec3				reflectivity;
	vec3				reflectivitySecondary;
	vec3				fresnel;
	vec3				fresnelSecondary;
	vec3				sheen;
	float				sheenRoughness;
	vec3				fuzz;
	bool				fuzzGlossMask;
	vec3				transmissivity;
	float				thinScatter;
	float				eta;
	float				etaSecondary;
	float				metalness;
	float				diffusion;
	float				transmission;
	vec3				emission;
	bool				emissionUnderCoat;
	vec3				scatterColor;
	vec3				scatterDepth;
	vec3				refractionColor;
	vec3				anisoTangent;
	
	//anisotropic GGX precompute data
	vec3				anisoDirection;
	vec3				anisoDirectionSecondary;
	float				anisoAspect;
	float				anisoAspectSecondary;

	//glints precompute data
	half3				glintPackedData; // (1) half lod distribution, (2) half total cdf, (3) half glintMinorLength
	vec3				glintEWACoeff; // elliptical coefficients (3 coefficients)
	half				glintIntensity; // intensity of the glint layer
	half				glintRoughness; // roughness of the glint layer
	vec2				glintUV; // procedurally generated UV coordinates
	int2				glintS; // (1 & 2) grid cell indices (start and end horizontally)
	int2				glintT; // (1 & 2) grid cell indices (start and end vertically)
	half				glintWeight; // projection weighting
	ushort				glintLOD; // lod
	vec4				glintSettings; // (1) glintDensity, (2) exponential glintDistance, (3) inverse glint scale, (4) extent length in world space
	bool				glintUseMicrofacet; // use microfacet roughness or use glint rouughness for specifying the roughness of glints

	//newton's rings precompute data
	float				newtonsRingsThickness;
	float				newtonsRingsIntensity;

	//hair inputs
	vec3 				hairAlbedo;
	vec3 				hairTint;

	//hair precompute data
	HairState 			hairState;
	HairState 			hairStateSecondary;

	//raster & painting only
#if( !defined( MSET_RAYTRACING ) ) || defined( MSET_HYBRID_RENDER )
	float				occlusion;
	float				cavity;
    float				cavityDiffuse;  // TODO: To be potentially cleaned up with further material state refactor ~bs
    float				cavitySpecular;  // TODO: To be potentially cleaned up with further material state refactor ~bs
	vec3				diffuseLight;
	vec3				specularLight;
	float				refractionThickness;
	vec4				translucencyColor;
#endif

#if defined( MSET_HYBRID_RENDER )
	uint3				ldsParams;
	float				diffuseLightPdf;
	float				specularLightPdf;
	float				sampledGloss;
#endif

	//ray tracing only
	RNG					rng;
#ifdef MSET_RAYTRACING
	float				rayOffset;
	float				dP, dD, dN; //compact differentials
	float				skyOcclusion;
	float				reflectionOcclusion;
	bool				shadowCatcherIndirect;
	bool				allowSubsurfaceDiffusion;
	bool				allowSkySampling;
#endif
	bool				allowSurfaceBevel;
#ifdef MATERIAL_PASS_BAKE
	uint				bakePass;
#endif
	
	//interior medium
	vec3				mediumExtinction;
	vec3				mediumScatter;
	float				mediumAnisotropy;

	//generic attributes
	vec4				generic0;
	vec4				generic1;
	vec4				generic2;
	vec4				generic3;

	//final outputs
	vec4				output0;
	vec4				output1;
	vec4				output2;
	vec4				output3;
	vec4				output4;
	vec4				output5;
	vec4				output6;
	vec4				output7;
};

FragmentState newFragmentState()
{
	FragmentState state;
	
	//inputs
	state.normalAdjust = 1.0;
	state.normalStrict = false;
	state.screenCoord = uint2( 0, 0 );
	state.screenTexCoord = vec2( 0.0, 0.0 );
	state.screenDepth = 0.0;
	state.sampleCoverage = 0xFFFFFFFF;
	state.objectID = 0;
	state.primitiveID = 0;
	state.frontFacing = true;
	
	//texcoords
	state.vertexTexCoord = newSampleCoord();
	state.vertexTexCoordBase = vec4( 0.0, 0.0, 0.0, 0.0 );
	state.vertexTexCoordSecondary = vec4( 0, 0, 0, 0 );
	
	//state
	state.albedo = vec4(1.0,1.0,1.0,1.0);
	state.baseColor = state.albedo.rgb;
	state.displacement = vec3( 0.0, 0.0, 0.0 );
	state.gloss = 0.0;
	state.glossSecondary = 0.0;
	state.glossTransmission = 0.0;
	state.reflectivity = vec3(0.0,0.0,0.0);
	state.reflectivitySecondary = vec3(0.0,0.0,0.0);
	state.fresnel = vec3(1.0,1.0,1.0);
	state.fresnelSecondary = vec3(1.0,1.0,1.0);
	state.sheen = vec3(0.0,0.0,0.0);
	state.sheenRoughness = 0.0;
	state.fuzz = vec3(0.0,0.0,0.0);
	state.fuzzGlossMask = false;
	state.transmissivity = vec3(0.0,0.0,0.0);
	state.thinScatter = 0.0;
	state.eta = (1.0/1.5); //IOR=1.5 in vacuum
	state.etaSecondary = state.eta;
	state.metalness = 0.0;
	state.diffusion = 1.0;
	state.transmission = 0.0;
	state.emission = vec3( 0.0, 0.0, 0.0 );
	state.emissionUnderCoat = false;
	state.scatterColor = state.baseColor;
	state.scatterDepth = vec3( 0.0, 0.0, 0.0 );
	state.refractionColor = state.baseColor;
	state.anisoTangent = vec3( 0.0, 1.0, 0.0 );
	
	//anisotropic GGX precompute data
	state.anisoDirection = vec3( 0.0, 0.0, 0.0 );
	state.anisoDirectionSecondary = vec3( 0.0, 0.0, 0.0 );
	state.anisoAspect = 1.0;
	state.anisoAspectSecondary = 1.0;

	//glints precompute data
	state.glintUV = vec2(0.0, 0.0);
	state.glintPackedData = half3(0.0, 0.0, 0.0);
	state.glintEWACoeff = vec3(0.0, 0.0, 0.0);
	state.glintIntensity = 0.0;
	state.glintRoughness = 0.0;
	state.glintS = int2(0, 0);
	state.glintT = int2(0, 0);
	state.glintWeight = half(1.0);
	state.glintLOD = 0;
	state.glintSettings = vec4( 0, 0, 0, 0 );
	state.glintUseMicrofacet = false;
	
	//newton's rings precompute data
	state.newtonsRingsThickness = 0.0;
	state.newtonsRingsIntensity = 0.0;

	state.hairAlbedo = vec3( 0.0, 0.0, 0.0 );
	state.hairTint = vec3( 1.0, 1.0, 1.0 );

	state.hairState.hairDirection = vec3( 0.0, -1.0, 0.0 );
	state.hairState.hairSigmaA = vec3( 0.0, 0.0, 0.0 );
	state.hairState.hairType = 0;
	state.hairState.hairBetaM = 0.0;
	state.hairState.hairBetaN = 0.0;
	state.hairState.hairV = vec4( 0.0, 0.0, 0.0, 0.0 );
	state.hairState.hairS = 0.0;
	state.hairState.hairSin2kAlpha = vec3( 0.0, 0.0, 0.0 );
	state.hairState.hairCos2kAlpha = vec3( 0.0, 0.0, 0.0 );
	state.hairStateSecondary = state.hairState;

	//raster & painting only
#if( !defined( MSET_RAYTRACING ) ) || defined( MSET_HYBRID_RENDER )
	state.occlusion = 1.0;
	state.cavity = 1.0;
    state.cavityDiffuse = 1.0;
    state.cavitySpecular = 1.0;
	state.diffuseLight = vec3( 0.0, 0.0, 0.0 );
	state.specularLight = vec3( 0.0, 0.0, 0.0 );
	state.refractionThickness = 0.0;
	state.translucencyColor = vec4( 0.0, 0.0, 0.0, 0.0 );
#endif

	//ray tracing only
#ifdef MSET_RAYTRACING
	state.dP = 
	state.dD = 
	state.dN = 0.0;
	state.skyOcclusion = 1.0;
	state.reflectionOcclusion = 1.0;
	state.shadowCatcherIndirect = false;
	state.allowSubsurfaceDiffusion = true;
	state.allowSkySampling = true;
#endif
	state.allowSurfaceBevel = true;
#ifdef MATERIAL_PASS_BAKE
	state.bakePass = 0;
#endif
	
	//interior medium
	state.mediumExtinction = vec3( 0.0, 0.0, 0.0 );
	state.mediumScatter = vec3( 0.0, 0.0, 0.0 );
	state.mediumAnisotropy = 0.0;
	
#ifdef MSET_RAYTRACING
	// some ray tracing only variables
	state.skyOcclusion = 1.0;
	state.reflectionOcclusion = 1.0;
	state.scatterDepth = vec3( 0.0, 0.0, 0.0 );
	state.shadowCatcherIndirect = false;
#endif

#if( !defined( MSET_RAYTRACING ) ) || defined( MSET_HYBRID_RENDER )
	// raster only variables
	state.occlusion = 1.0;
	state.cavity = 1.0;
    state.cavityDiffuse = 1.0;
    state.cavitySpecular = 1.0;
	state.diffuseLight = vec3( 0.0, 0.0, 0.0 );
	state.specularLight = vec3( 0.0, 0.0, 0.0 );
	state.refractionThickness = 0.0;
#endif

#if defined( MSET_HYBRID_RENDER )
	state.diffuseLightPdf = 0.0f;
	state.specularLightPdf = 0.0f;
	state.sampledGloss = 0.0f;
#endif

	//generic attributes
	state.generic0 =
	state.generic1 =
	state.generic2 =
	state.generic3 = vec4(0.0,0.0,0.0,0.0);

	//final outputs
	state.output0 =
	state.output1 =
	state.output2 =
	state.output3 =
	state.output4 =
	state.output5 =
	state.output6 =
	state.output7 = vec4(0.0,0.0,0.0,1.0);

	return state;
}

#include "texture.frag"
#ifdef SHADER_COMPUTE
#include "texture.comp"
#endif

#endif
