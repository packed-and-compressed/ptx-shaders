#include "blendfunctions.sh"

#ifndef _blendValuesFunc
#define _blendValuesFunc

//directly blend values inside effect, replicate layer blend exactly - subject to move/change
vec4 blendValues(vec4 front, vec4 back, float fade, int mode)
{
	//runtime blend

	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	
	if ( mode == LBLEND_REPLACE )
	{ 
		return blendReplace( front, back, fade ); 
	}	
	else if ( mode == LBLEND_FADE_REPLACE )
	{
		return blendFadeReplace( front, back, fade );		
	}
	else if ( mode == LBLEND_ALPHA )
	{
		return blendAlpha( front, back, fade );
	}
	else if ( mode == LBLEND_VECTOR_ALPHA )
	{
		return blendVectorAlpha( front, back, fade );
	}
	else if ( mode == LBLEND_VECTOR_DETAIL )
	{
		return blendVectorDetail( front, back, fade );
	}
	else if ( mode == LBLEND_ADD )
	{
		return blendAdd( front, back, fade );
	}
	else if ( mode == LBLEND_MULTIPLY )
	{
		return blendMultiply( front, back, fade );
	}
	else if ( mode == LBLEND_OVERLAY )
	{
		return blendOverlay( front, back, fade );
	}
	else if ( mode == LBLEND_SCREEN )
	{
		return blendScreen( front, back, fade );
	}
	else if ( mode == LBLEND_LIGHTEN )
	{
		return blendLighten( front, back, fade );
	}
	else if ( mode == LBLEND_DARKEN )
	{
			return blendDarken( front, back, fade );
	}
	else if ( mode == LBLEND_COLOR_DODGE )
	{
		return blendColorDodge( front, back, fade );
	}
	else if ( mode == LBLEND_COLOR_BURN )
	{
		return blendColorBurn( front, back, fade );
	}
	else if ( mode == LBLEND_LINEAR_BURN )
	{
		return blendLinearBurn( front, back, fade );
	}	
	return back;
}

#endif
