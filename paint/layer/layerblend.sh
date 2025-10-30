#ifndef LAYER_BLEND_SH
#define LAYER_BLEND_SH

#include "blendfunctions.sh"
#include "layerformat.sh"

#define LBLEND_ALPHA			0
#define LBLEND_VECTOR_ALPHA		1
#define LBLEND_ADD				2
#define LBLEND_VECTOR_DETAIL	3
#define LBLEND_REPLACE			4
#define LBLEND_MULTIPLY			5
#define LBLEND_OVERLAY			6
#define LBLEND_SCREEN			7
#define LBLEND_LIGHTEN			8
#define LBLEND_DARKEN			9
#define LBLEND_COLOR_DODGE		10
#define LBLEND_COLOR_BURN		11
#define LBLEND_LINEAR_BURN		12
#define LBLEND_FADE_REPLACE		13
#define LBLEND_PASSTHRU			14
#define LBLEND_DIRECTION		15
#define LBLEND_DIRECTION_DETAIL 16

#ifdef LAYER_BLEND
	#define LBLEND	LAYER_BLEND
#else
	#define	LBLEND	LBLEND_ALPHA
#endif

#ifdef LAYER_BLEND_SRGB
	#undef LAYER_BLEND_SRGB
#endif

#if defined(LAYER_OUTPUT_SRGB) || defined(LAYER_EMULATE_SRGB) || defined(LAYER_OUTPUT_PERCEPTUAL)
	#if (LBLEND == LBLEND_ADD) ||\
		(LBLEND == LBLEND_SCREEN) ||\
		(LBLEND == LBLEND_OVERLAY) ||\
		(LBLEND == LBLEND_LIGHTEN) ||\
		(LBLEND == LBLEND_DARKEN) ||\
		(LBLEND == LBLEND_COLOR_DODGE) ||\
		(LBLEND == LBLEND_COLOR_BURN) ||\
		(LBLEND == LBLEND_LINEAR_BURN)
		#define LAYER_BLEND_SRGB
	#endif
#endif

vec4	blend( vec4 front, vec4 back, float fade )
{
	#ifdef LAYER_BLEND_SRGB
		front.rgb = linearTosRGB(front.rgb);
		back.rgb = linearTosRGB(back.rgb);
	#endif

	vec4 result = back;

	#if LBLEND == LBLEND_REPLACE
		result = blendReplace( front, back, fade );
	#elif LBLEND == LBLEND_FADE_REPLACE				
		result = blendFadeReplace( front, back, fade );
	#elif LBLEND == LBLEND_ALPHA
		result = blendAlpha( front, back, fade );
	#elif LBLEND == LBLEND_VECTOR_ALPHA
		result = blendVectorAlpha( front, back, fade );
	#elif LBLEND == LBLEND_VECTOR_DETAIL
		result = blendVectorDetail( front, back, fade );
	#elif LBLEND == LBLEND_DIRECTION
		result = blendVectorAlpha( front, back, fade );
	#elif LBLEND == LBLEND_DIRECTION_DETAIL
		result = blendDirectionDetail( front, back, fade );
	#elif LBLEND == LBLEND_ADD
		result = blendAdd( front, back, fade );
	#elif LBLEND == LBLEND_MULTIPLY
		result = blendMultiply( front, back, fade );
	#elif LBLEND == LBLEND_OVERLAY
		result = blendOverlay( front, back, fade );
	#elif LBLEND == LBLEND_SCREEN
		result = blendScreen( front, back, fade );
	#elif LBLEND == LBLEND_LIGHTEN
		result = blendLighten( front, back, fade );
	#elif LBLEND == LBLEND_DARKEN
		result = blendDarken( front, back, fade );
	#elif LBLEND == LBLEND_COLOR_DODGE
		result = blendColorDodge( front, back, fade );
	#elif LBLEND == LBLEND_COLOR_BURN
		result = blendColorBurn( front, back, fade );
	#elif LBLEND == LBLEND_LINEAR_BURN
		result = blendLinearBurn( front, back, fade );
	#endif
		
	#ifdef LAYER_BLEND_SRGB		
		result.rgb = sRGBToLinear( result.rgb );
	#endif
	
	return result;
}
#endif
