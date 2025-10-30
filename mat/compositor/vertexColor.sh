#include "data/shader/mat/state.frag"
#include "data/shader/mat/layerBlendComposite.frag"

#if defined(SHADER_PIXEL) || defined(SHADER_COMPUTE)

struct VertexColorCompositorParams
{
	uint channel;								// vertex color channel
	packed_vec2 brightnessContrastScaleBias;	// brightness + contrast
};

float VertexColorCompositorBlendFactor( in VertexColorCompositorParams params, vec4 vertexColor )
{
	float blendingCoefficient = 0.0;
	switch( params.channel )
	{
		case 0: blendingCoefficient = vertexColor.r; break;
		case 1: blendingCoefficient = vertexColor.g; break;
		case 2: blendingCoefficient = vertexColor.b; break;
		case 3: blendingCoefficient = vertexColor.a; break;
	}
    return saturate( params.brightnessContrastScaleBias.x * blendingCoefficient + params.brightnessContrastScaleBias.y );
}

void VertexMaterialComposite( in VertexColorCompositorParams params, uint2 blendOperators, in FragmentState state, inout MaterialState material, in MaterialState layerMaterial, uint layerIndex )
{
	float blendingCoefficient = VertexColorCompositorBlendFactor( params, state.vertexColor );
	LayerBlendStates( state, blendOperators, material, layerMaterial, blendingCoefficient );
}

#define	CompositorParams								VertexColorCompositorParams
#define	MaterialCompositeBlendFactor(p,l,puv,suv,vc)	VertexColorCompositorBlendFactor(p.compositor,vc)
#define	MaterialComposite(p,s,m,lm,l)					VertexMaterialComposite(p.compositor,p.blendOperators,s,m,lm,l)

#endif
