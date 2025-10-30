#include "data/shader/mat/state.frag"
#include "data/shader/mat/layerBlendComposite.frag"

#if defined(SHADER_PIXEL) || defined(SHADER_COMPUTE)

struct HeightCompositorParams
{
	uint layerScale;							// total layer count (including not visible layers)
	uint texture;								// height texture
	packed_vec2 brightnessContrastScaleBias;	// brightness + contrast
};

float HeightCompositorBlendFactor( in HeightCompositorParams params, vec4 uvs, uint layerIndex )
{
	float blendingCoefficient = textureMaterial( params.texture, uvs, 1.0 );
    blendingCoefficient = params.brightnessContrastScaleBias.x * blendingCoefficient + params.brightnessContrastScaleBias.y;
	return saturate( blendingCoefficient * ( params.layerScale ) - layerIndex + 1 );
}

void HeightMaterialComposite( in HeightCompositorParams params, uint2 blendOperators, in FragmentState state, inout MaterialState material, in MaterialState layerMaterial, uint layerIndex )
{
	float blendingCoefficient = HeightCompositorBlendFactor( params, state.vertexTexCoordBase, layerIndex );
	LayerBlendStates( state, blendOperators, material, layerMaterial, blendingCoefficient );
}

#define	CompositorParams								HeightCompositorParams
#define	MaterialCompositeBlendFactor(p,l,puv,suv,vc)	HeightCompositorBlendFactor(p.compositor,puv,l)
#define	MaterialComposite(p,s,m,lm,l)					HeightMaterialComposite(p.compositor,p.blendOperators,s,m,lm,l)

#endif
