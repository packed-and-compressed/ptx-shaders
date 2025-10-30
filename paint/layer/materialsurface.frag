#ifndef MATERIAL_SURFACE_FRAG
#define MATERIAL_SURFACE_FRAG

#include "layer.sh"
#include "../../common/colorspacerecolor.sh"
#include "layerformat.sh"

uniform int		uReplaceColor;
uniform int		uInvert;
uniform int		uSurfaceUseRecolor;
uniform int		uAnisoPaintBrushDir;
uniform vec3	uSurfaceRecolorGoalRGB;
uniform vec3	uSurfaceRecolorGoalHSV;
uniform vec4	uSVParams;
uniform float	uSurfaceContrast;
uniform float	uSurfaceLeftHandedNormals;
uniform uint	uIsGrayChannel;

USE_TEXTURE2D(tDir); 

void adjustNormal( inout vec4 c )
{
#if LAYER_OUTPUT == CHANNEL_NORMAL
	//scale bias & normalize
	if( uInvert )
	{ c = vec4( 1.0 - c.r, 1.0 - c.g, c.b, c.a ); }
	c.rgb = c.rgb * 2.0 - vec3(1.0,1.0,1.0);
	vec3 recolor = uSurfaceRecolorGoalRGB*2.0 - vec3(1.0,1.0,1.0);
	c.rgb = (c.rgb - recolor)*uSurfaceContrast + recolor;
	c.rgb = normalize( c.rgb );

	//left-handed normals get a flip
	c.g *= (-2.0 * uSurfaceLeftHandedNormals) + 1.0;
	c.rgb = 0.5*c.rgb + vec3(0.5,0.5,0.5);
#endif
}

void adjustNormalAniso( LayerState state, inout vec4 c )
{
#if LAYER_OUTPUT == CHANNEL_ANISO_DIR
	
	TangentBasis basis;
	basis.T = state.tangent;
	basis.B = state.bitangent;
	basis.N = state.normal;

	c.b = 0.5;
	c.rgb = c.rgb * 2.0 - 1.0;
	c.rgb = transformVecTo( basis, c.rgb );
	c.rgb = normalize( c.rgb );
	c.rgb = c.rgb * 0.5 + 0.5;

#endif
}

void adjustNormalPaintedAniso( LayerState state, inout vec4 c )
{
#if LAYER_OUTPUT == CHANNEL_ANISO_DIR

	vec3 data = texture2D(tDir, state.texCoord).xyz;
	float flow = data.x;
	vec2 dir = data.yz;
	if( flow == 0.0 ) 
	{
		c.rgb = vec3(0.5, 1.0, 0.5);
			
		adjustNormalAniso( state, c );
	}
	else
	{
		if( length(dir) > 0.0 )
		{
			dir /= flow; // de-attenuate the direction value
			dir = normalize(dir); 

			c.rgb = vec3(dir.xy, 0.0) * 0.5 + vec3(0.5, 0.5, 0.5);
		}
		else
		{ discard; }
	}

#endif
}

void getGrayChannelHSV( inout vec3 hsv )
{
	float saturationDiff = 0.f;
	float valueFactor = uSVParams.x * hsv.z + uSVParams.y;

	hsv.y = saturate( hsv.y + saturationDiff ); 
	hsv.z = saturate( hsv.z + valueFactor ); 
}

void getColorChannelHSV( inout vec3 hsv, inout vec3 rgb_H, vec3 rgb )
{
	float saturationDiff	= uSVParams.x * hsv.y + uSVParams.y;

	float valueDiv			= 1.f / max(hsv.z, VAL_EPSILON);
	float valueFactor		= uSVParams.z * valueDiv + uSVParams.w;

	rgb_H = 0.f; 
	hsv = RGBtoHSVAndRGB_H( rgb, rgb_H );

	hsv.y = saturate( hsv.y + saturationDiff ); 
	hsv.z = saturate( hsv.z * valueFactor );
}

void adjustColor( inout vec4 c )
{
#if LAYER_OUTPUT != CHANNEL_NORMAL && LAYER_OUTPUT != CHANNEL_ANISO_DIR

	if( uReplaceColor > 0 )
	{
		c.rgb = saturate( uSurfaceRecolorGoalRGB );
	}
	else
	{
		vec3 rgb = c.rgb;
		#if defined( SURFACE_ADJUSTMENT ) && defined( IS_GRAYSCALE ) 
			vec3 hsv = vec3( 0.f, 0.f, rgb.r );
		#else
			vec3 hsv = RGBtoHSV(rgb);
		#endif

		// ***** Hue *****
		#ifndef IS_GRAYSCALE
		{
			// If needed, the color inversion has already been done on CPU (if not a grayscale channel)
			vec3 goalHSV = uSurfaceRecolorGoalHSV;

			if( uSurfaceUseRecolor )
			{ rgb = HSVtoRGB(vec3(goalHSV.x, max(hsv.y, SAT_EPSILON), hsv.z)); }
		}
		#endif

		// ***** Saturation & Value *****
		vec3 rgb_H = 0.f; 
		#ifdef SURFACE_ADJUSTMENT 
			#ifdef IS_GRAYSCALE
				getGrayChannelHSV( hsv );
			#else
				getColorChannelHSV( hsv, rgb_H, rgb );
			#endif
		#else
			if( uIsGrayChannel )
				getGrayChannelHSV( hsv );
			else
				getColorChannelHSV( hsv, rgb_H, rgb );
		#endif

		rgb = finalizeRGBWithSV( rgb_H, hsv.y, hsv.z );

		if( uInvert )
		{ rgb = invertColorFormatted( rgb ); }

		c.rgb = rgb;
	}

#endif
}

vec4	materialSurfaceAdjust( LayerState state, vec4 c )
{
#if defined( SURFACE_ADJUSTMENT ) && !defined( NEED_OUTPUT_ADJUSTMENT )
	return c;
#endif

	#if LAYER_OUTPUT == CHANNEL_NORMAL
		adjustNormal( c );
	#elif LAYER_OUTPUT == CHANNEL_ANISO_DIR
		if( uAnisoPaintBrushDir )					// aniso. dir, painted in tDir
		{ adjustNormalPaintedAniso( state, c ); }
		else 										// aniso. dir, sampled/calculated elsewhere
		{ adjustNormalAniso( state, c ); }
	#else
		adjustColor( c );
	#endif 
	
	return c;
}

#endif
