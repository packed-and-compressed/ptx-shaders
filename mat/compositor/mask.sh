#include "data/shader/mat/state.frag"
#include "data/shader/mat/layerBlendComposite.frag"

#if defined(SHADER_PIXEL) || defined(SHADER_COMPUTE)

struct MaskCompositorParams
{
	uint texture;								// texture id + encoded swizzle
	packed_vec2 brightnessContrastScaleBias;	// brightness + contrast
};

float MaskCompositorBlendFactor( in MaskCompositorParams params, vec4 primaryUVs, vec4 secondaryUVs )
{
	const uint TEXTURE_CHANNEL_MASK = 0x80000000;

	uint index = params.texture;
	bool useSecondaryUVs = index & TEXTURE_FLAG_UDIM_MODE;
	index &= ~uint(TEXTURE_CHANNEL_MASK);

	const vec4 uvSet = ( useSecondaryUVs ? secondaryUVs : primaryUVs );
	float blendingCoefficient = textureMaterial( index, uvSet, 1.0 );
    return saturate( params.brightnessContrastScaleBias.x * blendingCoefficient + params.brightnessContrastScaleBias.y );
}

void MaskMaterialComposite( in MaskCompositorParams params, uint2 blendOperators, in FragmentState state, inout MaterialState material, in MaterialState layerMaterial, uint layerIndex )
{
	float blendingCoefficient = MaskCompositorBlendFactor( params, state.vertexTexCoordBase, state.vertexTexCoordSecondary );
	LayerBlendStates( state, blendOperators, material, layerMaterial, blendingCoefficient );
}

#define	CompositorParams								MaskCompositorParams
#define	MaterialCompositeBlendFactor(p,l,puv,suv,vc)	MaskCompositorBlendFactor(p.compositor,puv,suv)
#define	MaterialComposite(p,s,m,lm,l)					MaskMaterialComposite(p.compositor,p.blendOperators,s,m,lm,l)

#endif
