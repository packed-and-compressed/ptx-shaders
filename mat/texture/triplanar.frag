//inherits "texture.frag"

#include "data/shader/common/differential.sh"
#include "data/shader/common/projector.sh"
#include "data/shader/common/packed.sh"

#if ( defined(MATERIAL_PASS_DEFORM) ||\
	  defined(MATERIAL_PASS_LIGHT) ||\
      defined(MATERIAL_PASS_SCATTER) ||\
      defined(MATERIAL_PASS_COMPONENTVIEW) ||\
      defined(MATERIAL_PASS_PREPASS) ||\
      defined(MATERIAL_PASS_PREPASS_RT) ||\
      defined(MATERIAL_PASS_PREPASS_RTAO) ||\
      defined(MATERIAL_PASS_PREPASS_HYBRID) ||\
      defined(MATERIAL_PASS_SHADOWMAP) ||\
      defined(MATERIAL_PASS_COLOR_SAMPLE) )
uniform mat4    uMaterialTriplanarShadingToWorldTransform;
uniform mat4    uMaterialTriplanarWorldToShadingTransform;
uniform mat4    uMaterialTriplanarWorldToShadingRotation;
#endif

struct TriplanarTextureParams
{  
    packed_mat3x4 worldToProjectorTransform;
    packed_mat3x4 projectorToWorldRotation;
    
    float fade;
};
void    initializeTriplanarSampleCoords( TriplanarTextureParams params, inout FragmentState s, inout SampleCoord sampleCoord, diff3 dP, vec4 uvScaleBias, vec2 uvRotation )
{
    const vec3 DUMMY_TANGENT = vec3(0.0, 0.0, 0.0);
    const vec3 DUMMY_BITANGENT = vec3(0.0, 0.0, 0.0);
    const vec4 DEFAULT_UV_SCALE_AND_BIAS = vec4(1.0, 1.0, 0.0, 0.0);
    const vec2 DEFAULT_UV_ROTATION = vec2(1.0, 0.0);
    
    initializeBaseSampleCoords( s, sampleCoord, dP, uvScaleBias, uvRotation );
    
    #if ( defined(MATERIAL_PASS_DEFORM) ||\
		defined(MATERIAL_PASS_LIGHT) ||\
	  	defined(MATERIAL_PASS_SCATTER) ||\
	  	defined(MATERIAL_PASS_COMPONENTVIEW) ||\
	  	defined(MATERIAL_PASS_PREPASS) ||\
	  	defined(MATERIAL_PASS_PREPASS_RT) ||\
      	defined(MATERIAL_PASS_PREPASS_RTAO) ||\
	  	defined(MATERIAL_PASS_PREPASS_HYBRID) ||\
	  	defined(MATERIAL_PASS_SHADOWMAP) ||\
        defined(MATERIAL_PASS_COLOR_SAMPLE) )
        // For these passes there is an additional transform that needs to be applied
        sampleCoord.projectorToShadingRotation = submatrix3x3( mul( uMaterialTriplanarWorldToShadingRotation, expandToMat4( unpack( params.projectorToWorldRotation ) ) ) );
        mat3x4 shadingToProjectorTransform = submatrix3x4( mul( expandToMat4( unpack( params.worldToProjectorTransform ) ), uMaterialTriplanarShadingToWorldTransform ) );
    #else
        sampleCoord.projectorToShadingRotation = submatrix3x3( unpack( params.projectorToWorldRotation ) );
        mat3x4 shadingToProjectorTransform = unpack( params.worldToProjectorTransform );
    #endif

    mat3x3 shadingToProjectorRotation = transpose( sampleCoord.projectorToShadingRotation );

    vec3 triplanarVertexPosition = mulPoint( shadingToProjectorTransform, s.triplanarPosition ).xyz;
    vec3 triplanarVertexNormal = mulVec( shadingToProjectorRotation, s.triplanarNormal );  // No need to normalize - pure rotation
    vec3 triplanarTangentBasisNormal = mulVec(shadingToProjectorRotation, s.vertexNormal);  // No need to normalize - pure rotation
    
    #ifdef MATERIAL_TEXTURE_GRADS
        diff3 dTriplanarP = mulDifferential( shadingToProjectorTransform, dP );
	    sampleCoord.projectorCoord = getTriplanarProjectorLod( triplanarVertexPosition, 
                                                               triplanarVertexNormal,    
                                                               createTangentBasis( DUMMY_TANGENT, DUMMY_BITANGENT, triplanarTangentBasisNormal ),
                                                               dTriplanarP.dx,
                                                               dTriplanarP.dy,
                                                               uvScaleBias,
                                                               uvRotation,
                                                               DEFAULT_UV_SCALE_AND_BIAS,
                                                               DEFAULT_UV_ROTATION,
                                                               params.fade,
                                                               s.frontFacing );
    #else
        sampleCoord.projectorCoord = getTriplanarProjector( triplanarVertexPosition,
                                                            triplanarVertexNormal,
													        createTangentBasis( DUMMY_TANGENT, DUMMY_BITANGENT, triplanarTangentBasisNormal ),
													        uvScaleBias,
													        uvRotation,
                                                            params.fade,
													        s.frontFacing );
    #endif
}

#undef  TextureParams
#undef  InitializeSampleCoords
#undef  InitializeMaterialStateSampleCoords
#define TextureParams TriplanarTextureParams

#define InitializeSampleCoords(p,s,dp,uvs,uvr)      		    initializeTriplanarSampleCoords(p.texture,s,s.vertexTexCoord,dp,uvs,uvr)
#define InitializeMaterialStateSampleCoords(p,s,m,dp,uvs,uvr)   initializeTriplanarSampleCoords(p.texture,s,m.vertexTexCoord,dp,uvs,uvr)
