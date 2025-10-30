#ifndef LAYER_INPUT_SH
#define LAYER_INPUT_SH

#include "layerbuffer.sh"
#include "layerformat.sh"

//This header defines all the macros and helper functions used for input map sampling

//The API resembles declaring a CPR texture uniform with a USE_INPUT_MAP macro and an InputMap ID as a parameter
//e.g. USE_INPUT_MAP( INPUT_BUMP )

//Input maps should be sampled using the sampleInputRaw/Gray/RGBA/Vector macros, with an inputID as the first argument
//e.g. sampleInputVector( INPUT_NORMAL, uv )

//Internally, input maps are sampled with the shared sampler object uBufferSampler, and decoded with decodeToVector/Gray/RGBA functions.
//See layerbuffer.sh for details.

//In C++, inputs must be added to the InputStage of the LayerRenderConfig object. Input maps are added by input ID + input settings.
//e.g. config.inputMaps.add( INPUT_AO, project->getInputMapSettings( INPUT_AO ) );

#define USE_INPUT_MAP(id)\
	USE_LAYER_BUFFER2D(tInputMap##id);\
	uniform vec4 uInputScale##id;\
	uniform vec4 uInputBias##id;\
	uniform int uInputMapFormat##id;

///
	#define decodeInputGray( id, samp4 )	decodeToGray( uInputMapFormat##id, samp4 )
	#define decodeInputRGBA( id, samp4 )	decodeToRGBA( uInputMapFormat##id, samp4 )
	#define decodeInputVector( id, samp4 )	decodeToVector( uInputMapFormat##id, samp4 )
#ifdef LAYER_COMPUTE
	#define sampleInputRaw( id, uv )	textureWithSamplerLod( tInputMap##id, uBufferSampler, uv, 0 )
	#define sampleInputGray( id, uv )	decodeToGray( uInputMapFormat##id,				 textureWithSamplerGrad( tInputMap##id, uBufferSampler, uv, vec2(uOutputSizeInv.x, 0.0), vec2(0.0, uOutputSizeInv.y) ) )
	#define sampleInputRGBA( id, uv	)	decodeToRGBA( uInputMapFormat##id,				 textureWithSamplerGrad( tInputMap##id, uBufferSampler, uv, vec2(uOutputSizeInv.x, 0.0), vec2(0.0, uOutputSizeInv.y) ) )
	#define sampleInputVector( id, uv )	decodeToVector( uInputScale##id, uInputBias##id, textureWithSamplerGrad( tInputMap##id, uBufferSampler, uv, vec2(uOutputSizeInv.x, 0.0), vec2(0.0, uOutputSizeInv.y) ) )
#else
	#define sampleInputRaw( id, uv )	textureWithSampler( tInputMap##id, uBufferSampler, uv )
	#define sampleInputGray( id, uv )	decodeToGray( uInputMapFormat##id,				 textureWithSampler( tInputMap##id, uBufferSampler, uv ) )
	#define sampleInputRGBA( id, uv	)	decodeToRGBA( uInputMapFormat##id,				 textureWithSampler( tInputMap##id, uBufferSampler, uv ) )
	#define sampleInputVector( id, uv )	decodeToVector( uInputScale##id, uInputBias##id, textureWithSampler( tInputMap##id, uBufferSampler, uv ) )
#endif

	#define sampleInputRawLod( id, uv, lod )	textureWithSamplerLod( tInputMap##id, uBufferSampler, uv, lod )
	#define sampleInputGrayLod( id, uv, lod )	decodeToGray( uInputMapFormat##id,				 textureWithSamplerLod( tInputMap##id, uBufferSampler, uv, lod ) )
	#define sampleInputRGBALod( id, uv, lod	)	decodeToRGBA( uInputMapFormat##id,				 textureWithSamplerLod( tInputMap##id, uBufferSampler, uv, lod ) )
	#define sampleInputVectorLod( id, uv, lod )	decodeToVector( uInputScale##id, uInputBias##id, textureWithSamplerLod( tInputMap##id, uBufferSampler, uv, lod ) )

//INPUTS

#ifdef USE_INPUT_AO
USE_INPUT_MAP(INPUT_AO);
#endif

#ifdef USE_INPUT_CURVATURE
USE_INPUT_MAP(INPUT_CURVATURE);
#endif

#ifdef USE_INPUT_NORMAL
USE_INPUT_MAP(INPUT_NORMAL);
#endif

#ifdef USE_INPUT_NORMAL_OBJECT
USE_INPUT_MAP(INPUT_NORMAL_OBJECT);
#endif

#ifdef USE_INPUT_THICKNESS
USE_INPUT_MAP(INPUT_THICKNESS);
#endif

//@@@ NOTE: this is an internal input used for scratch and grunge generators. Refactor plz. --Andres
#ifdef USE_INPUT_GENERIC
USE_INPUT_MAP(INPUT_GENERIC);
#endif

#ifdef USE_INPUT_ALBEDO
USE_INPUT_MAP(INPUT_ALBEDO);
#endif

#ifdef USE_INPUT_GLOSS
USE_INPUT_MAP(INPUT_GLOSS);
#endif

#ifdef USE_INPUT_ROUGHNESS
USE_INPUT_MAP(INPUT_ROUGHNESS);
#endif

#ifdef USE_INPUT_METALNESS
USE_INPUT_MAP(INPUT_METALNESS);
#endif

#ifdef USE_INPUT_SPECULAR
USE_INPUT_MAP(INPUT_SPECULAR);
#endif

#ifdef USE_INPUT_TRANSPARENCY
USE_INPUT_MAP(INPUT_TRANSPARENCY);
#endif

#ifdef USE_INPUT_EMISSIVE
USE_INPUT_MAP(INPUT_EMISSIVE);
#endif

#ifdef USE_INPUT_HEIGHT
USE_INPUT_MAP(INPUT_HEIGHT);
#endif

#ifdef USE_INPUT_CAVITY
USE_INPUT_MAP(INPUT_CAVITY);
#endif

#ifdef USE_INPUT_MATERIAL_ID
USE_INPUT_MAP(INPUT_MATERIAL_ID);
#endif

#ifdef USE_INPUT_OBJECT_ID
USE_INPUT_MAP(INPUT_OBJECT_ID);
#endif

#ifdef USE_INPUT_UV_ISLAND
USE_INPUT_MAP(INPUT_UV_ISLAND);
#endif

#ifdef USE_INPUT_GROUP_ID
USE_INPUT_MAP(INPUT_GROUP_ID);
#endif

//19 is ALBEDO_METAL_DEPRECATED

#ifdef USE_INPUT_BUMP
USE_INPUT_MAP(INPUT_BUMP);
#endif

#ifdef USE_INPUT_FUZZ
USE_INPUT_MAP(21);
#endif

#ifdef USE_INPUT_TRANSMISSION_MASK
USE_INPUT_MAP(22);
#endif

#ifdef USE_INPUT_SHEEN
USE_INPUT_MAP(23);
#endif

#ifdef USE_INPUT_SHEEN_ROUGHNESS
USE_INPUT_MAP(24);
#endif

#ifdef USE_INPUT_ANISO_DIR
USE_INPUT_MAP(25);
#endif

#ifdef USE_INPUT_CUSTOM
USE_INPUT_MAP(26);
#endif


#endif
