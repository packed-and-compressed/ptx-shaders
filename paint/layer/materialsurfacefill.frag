#include "effect.frag"
#include "materialsurface.frag"

USE_TEXTURE2D(tFillTexture);
uniform vec4	uFillSwizzle;
uniform uint	uFillGrayScale;

//normals need to be multiplied by the inverse of the texture matrix after texture sampling
vec4 formatNormalTap( vec4 tap )
{
	vec3 n = tap.xyz * 2.0 - vec3(1.0,1.0,1.0);
	n = normalize(
		col0(uTextureMatrixInv).xyz * n.x +
		col1(uTextureMatrixInv).xyz * n.y +
		col2(uTextureMatrixInv).xyz * n.z );
	tap.xyz = n*0.5 + vec3(0.5,0.5,0.5);
	return tap;
}

vec4 runEffect(LayerState layerState)
{
	vec4 tex = texture2DAutoLod( tFillTexture, layerState.texCoord, layerState.dUVdx, layerState.dUVdy );
	tex = uFillGrayScale ? tex.rrra : tex;
	vec4 result = tex;
	
	return result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{
	vec4 result = state.result;

	result = materialSurfaceAdjust( state, result );

	#if LAYER_OUTPUT == CHANNEL_NORMAL || LAYER_OUTPUT == CHANNEL_ANISO_DIR
		result = formatNormalTap( result );			
	#endif
	
	#ifdef SPLINE_CONTOUR
		#if (LAYER_OUTPUT == CHANNEL_BUMP || LAYER_OUTPUT == CHANNEL_DISPLACEMENT)
			float contour = state.splineContourHeight;
			result.r += 1.0 * (contour - 0.5) * uContourAmplitude;
		#endif
	#endif	//SPLINE_CONTOUR

	return result; 
}
