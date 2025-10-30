#ifndef LAYER_BLEND_COMPOSITE_FRAG
#define LAYER_BLEND_COMPOSITE_FRAG

#include "data/shader/mat/layerBlend.frag"

// ----------------------------------------------------------------
// Layer compositing function
// ----------------------------------------------------------------
void LayerBlendStates( in FragmentState state, uint2 encodedBlendOperators, inout MaterialState material, in MaterialState layerMaterial, float blendingCoefficient )
{
    BlendOperatorCollection boc = DecodeBlendOperators( encodedBlendOperators );

    //transparency
    if( boc.operators[SUBROUTINE_TRANSPARENCY_BLEND] == MATERIAL_LAYER_BLENDING_MODE_STANDARD )
    {
        material.albedo.a = BlendField( boc.operators[SUBROUTINE_TRANSPARENCY_BLEND], (float)1.0, material.albedo.a, layerMaterial.albedo.a * blendingCoefficient );
    }
    else
    {
        material.albedo.a = BlendField( boc.operators[SUBROUTINE_TRANSPARENCY_BLEND], layerMaterial.albedo.a, material.albedo.a, blendingCoefficient );
    }

    //Incorporate alpha channel of albedo into the blending coefficient to account to the transparency of incoming layer
    blendingCoefficient *= layerMaterial.albedo.a;
    
    //albedo
    material.albedo.rgb = BlendFieldViasRBG( boc.operators[SUBROUTINE_ALBEDO_BLEND], layerMaterial.albedo.rgb, material.albedo.rgb, blendingCoefficient );
    
    //surface   
    material.normal = normalize( BlendVector( boc.operators[SUBROUTINE_SURFACE_BLEND], layerMaterial.normal, material.normal, blendingCoefficient, state.vertexNormal ) );
    material.normalAdjust = layerMaterial.normalAdjust || material.normalAdjust;
    
    //microsurface
    material.glossOrRoughness = BlendField( boc.operators[SUBROUTINE_MICROSURFACE_BLEND], layerMaterial.glossOrRoughness, material.glossOrRoughness, blendingCoefficient );
    material.glossOrRoughnessSecondary = BlendField( boc.operators[SUBROUTINE_CLEARCOAT_MICROSURFACE_BLEND], layerMaterial.glossOrRoughnessSecondary, material.glossOrRoughnessSecondary, blendingCoefficient );

    //reflectivity
    material.metalness = BlendField( boc.operators[SUBROUTINE_REFLECTIVITY_BLEND], layerMaterial.metalness, material.metalness, blendingCoefficient );
    material.specular = BlendFieldViasRBG( boc.operators[SUBROUTINE_REFLECTIVITY_BLEND], layerMaterial.specular, material.specular, blendingCoefficient );
    material.specularSecondary = BlendFieldViasRBG( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTIVITY_BLEND], layerMaterial.specularSecondary, material.specularSecondary, blendingCoefficient );
    material.fresnel = BlendFieldViasRBG( boc.operators[SUBROUTINE_REFLECTIVITY_BLEND], layerMaterial.fresnel, material.fresnel, blendingCoefficient );
    material.fresnelSecondary = BlendFieldViasRBG( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTIVITY_BLEND], layerMaterial.fresnelSecondary, material.fresnelSecondary, blendingCoefficient );
   
    //transmission
    material.transmission = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.transmission, material.transmission, blendingCoefficient );
    material.refractionColor = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.refractionColor, material.refractionColor, blendingCoefficient );
    material.refractionDepth = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.refractionDepth, material.refractionDepth, blendingCoefficient );
    material.refractionGlossOrRoughness = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.refractionGlossOrRoughness, material.refractionGlossOrRoughness, blendingCoefficient );
    material.refractionF0 = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.refractionF0, material.refractionF0, blendingCoefficient );
    material.refractionThickness = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.refractionThickness, material.refractionThickness, blendingCoefficient );
    material.refractionSquash = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.refractionSquash, material.refractionSquash, blendingCoefficient );
    material.scatterColor = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.scatterColor, material.scatterColor, blendingCoefficient );
    material.scatterDepth = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.scatterDepth, material.scatterDepth, blendingCoefficient );
    material.scatterAniso = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.scatterAniso, material.scatterAniso, blendingCoefficient );
    material.scatterTranslucency = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.scatterTranslucency, material.scatterTranslucency, blendingCoefficient );
    material.fuzz = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.fuzz, material.fuzz, blendingCoefficient );
    material.thinTranslucency = BlendFieldViasRBG( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.thinTranslucency, material.thinTranslucency, blendingCoefficient );
    material.thinScatter = BlendField( boc.operators[SUBROUTINE_TRANSMISSION_BLEND], layerMaterial.thinScatter, material.thinScatter, blendingCoefficient );

    //diffusion
    material.sheen = BlendFieldViasRBG( boc.operators[SUBROUTINE_DIFFUSION_BLEND], layerMaterial.sheen, material.sheen, blendingCoefficient );
    material.sheenTint = BlendField( boc.operators[SUBROUTINE_DIFFUSION_BLEND], layerMaterial.sheenTint, material.sheenTint, blendingCoefficient );
    material.sheenGlossOrRoughnes = BlendField( boc.operators[SUBROUTINE_DIFFUSION_BLEND], layerMaterial.sheenGlossOrRoughnes, material.sheenGlossOrRoughnes, blendingCoefficient );

    //reflection
    material.anisoDirection = BlendVector( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.anisoDirection, material.anisoDirection, blendingCoefficient, state.vertexNormal );
    material.anisoDirectionSecondary = BlendVector( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTION_BLEND], layerMaterial.anisoDirectionSecondary, material.anisoDirectionSecondary, blendingCoefficient, state.vertexNormal );
    material.anisoAspect = BlendField( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.anisoAspect, material.anisoAspect, blendingCoefficient );
    material.anisoAspectSecondary = BlendField( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTION_BLEND], layerMaterial.anisoAspectSecondary, material.anisoAspectSecondary, blendingCoefficient );

    //emission
    material.emission = BlendFieldViasRBG( boc.operators[SUBROUTINE_EMISSION_BLEND], layerMaterial.emission, material.emission, blendingCoefficient );

    //displacement
    #ifdef DISPLACEMENT_VECTOR_OUTPUT
        material.displacement = BlendVector( boc.operators[SUBROUTINE_DISPLACEMENT_BLEND], layerMaterial.displacement, material.displacement, blendingCoefficient, state.vertexNormal );
    #else
        material.displacement = BlendField( boc.operators[SUBROUTINE_DISPLACEMENT_BLEND], layerMaterial.displacement, material.displacement, blendingCoefficient );
    #endif

    // glints
    material.glintIntensity = BlendField( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.glintIntensity, material.glintIntensity, blendingCoefficient );
    material.glintGlossOrRoughness = BlendField( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.glintGlossOrRoughness, material.glintGlossOrRoughness, blendingCoefficient );
    material.glintDensity = BlendField( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.glintDensity, material.glintDensity, blendingCoefficient );
    material.glintScale = BlendField( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.glintScale, material.glintScale, blendingCoefficient );

    //newton's rings
    material.newtonsRingsThickness = BlendField( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTION_BLEND], layerMaterial.newtonsRingsThickness, material.newtonsRingsThickness, blendingCoefficient );
    material.newtonsRingsIntensity = BlendField( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTION_BLEND], layerMaterial.newtonsRingsIntensity, material.newtonsRingsIntensity, blendingCoefficient );

    //hair inputs
    material.hairAlbedo = BlendFieldViasRBG( boc.operators[SUBROUTINE_ALBEDO_BLEND], layerMaterial.hairAlbedo, material.hairAlbedo, blendingCoefficient );
    material.hairTint = BlendFieldViasRBG( boc.operators[SUBROUTINE_ALBEDO_BLEND], layerMaterial.hairTint, material.hairTint, blendingCoefficient );
    material.hairRadialRoughness = BlendField( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.hairRadialRoughness, material.hairRadialRoughness, blendingCoefficient );
    material.hairRadialRoughnessSecondary = BlendField( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTION_BLEND], layerMaterial.hairRadialRoughnessSecondary, material.hairRadialRoughnessSecondary, blendingCoefficient );
    material.hairDirection = normalize( BlendVector( boc.operators[SUBROUTINE_REFLECTION_BLEND], layerMaterial.hairDirection, material.hairDirection, blendingCoefficient, state.vertexNormal ) );
    material.hairDirectionSecondary = normalize( BlendVector( boc.operators[SUBROUTINE_CLEARCOAT_REFLECTION_BLEND], layerMaterial.hairDirectionSecondary, material.hairDirectionSecondary, blendingCoefficient, state.vertexNormal ) );
    
    //raster, painting & hybrid
    material.occlusion = BlendField( boc.operators[SUBROUTINE_OCCLUSION_BLEND], layerMaterial.occlusion, material.occlusion, blendingCoefficient );
    material.cavity = BlendField( boc.operators[SUBROUTINE_OCCLUSION_BLEND], layerMaterial.cavity, material.cavity, blendingCoefficient );
    material.cavityDiffuse = BlendField( boc.operators[SUBROUTINE_OCCLUSION_BLEND], layerMaterial.cavityDiffuse, material.cavityDiffuse, blendingCoefficient );
    material.cavitySpecular = BlendField( boc.operators[SUBROUTINE_OCCLUSION_BLEND], layerMaterial.cavitySpecular, material.cavitySpecular, blendingCoefficient );
}

#endif  // LAYER_BLEND_COMPOSITE_FRAG
