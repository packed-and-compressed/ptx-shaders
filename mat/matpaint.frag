#include "../paint/layer/effect.frag"
#include "state.frag"
#include "other/remap.frag"
#include "params.frag"
#include "../common/octpack.sh"
#include "../common/differential.sh"
#include "matEvaluate.frag"

uniform vec4	uViewportScaleBias;
uniform vec4	uLightSpaceCameraPosition;
#if !defined(EFFECT_POSITIONAL)
uniform ivec2	uTileCoords;
#endif

uniform mat4	uModelTransform;
uniform mat4	uModelTransformInverse;

//executes all material subroutines aside from premerge and merge
MaterialState evaluateMaterialLayer( in MaterialParams params, in LayerState layerState, inout FragmentState state )
{
	//initialize layer material state
	const diff3 dp = makeDifferential( layerState.dPosdx, layerState.dPosdy );
	const diff2 rd = makeDifferential( layerState.dUVdx, layerState.dUVdy );
    MaterialState material = newMaterialState();
    material.vertexTexCoord.uvCoord = vec4( layerState.texCoord, packTextureGrads( rd ) );
	InitializeMaterialStateSampleCoords( params, state, material, dp, uMaterialUvScaleBias, uMaterialUvRotation );
	
	//evaluate per-layer subroutines
	#ifdef Displacement
		Displacement(params, material, state);
	#endif
	#ifdef Surface
		Surface(params, material, state);
	#endif
	#ifdef Albedo
		Albedo(params, material, state);
	#endif
	#ifdef Microsurface
		Microsurface(params, material, state);
	#endif
	#ifdef Sheen
		Sheen(params, material, state);
	#endif
	#ifdef Glint
		Glint(params, material, state);
	#endif
	#ifdef Reflectivity
		Reflectivity(params, material, state);
	#endif
	#ifdef ReflectionPrecompute
		ReflectionPrecompute(params, material, state);
	#endif
	#ifdef MicrosurfaceSecondary
		MicrosurfaceSecondary(params, material, state);
	#endif
	#ifdef ReflectivitySecondary
		ReflectivitySecondary(params, material, state);
	#endif
	#ifdef ReflectionPrecomputeSecondary
		ReflectionPrecomputeSecondary(params, material, state);
	#endif
	#ifdef Transmissivity
		Transmissivity(params, material, state);
	#endif
	#ifdef Occlusion
		Occlusion(params, material, state);
	#endif
	#ifdef Cavity
		Cavity(params, material, state);
	#endif
	#ifdef Emissive
		Emissive(params, material, state);
	#endif
	#ifdef Transparency
		Transparency(params, material, state);
	#endif

	return material;
}

void evaluateMaterial( uint materialIndex, in MaterialParams params, in LayerState layerState, inout FragmentState state )
{
	#ifdef Premerge
		Premerge(state);
	#endif
	
	//evaluate base layer
	MaterialState material = evaluateMaterialLayer( params, layerState, state );
    state.vertexTexCoord = material.vertexTexCoord; //merge base layer tex coords so we don't have to recompute them again

	//evaluate & composite any additional layers
	#if MATERIAL_LAYER_COUNT > 1
		for( int layerIndex = 1; layerIndex < MATERIAL_LAYER_COUNT; ++layerIndex )
		{
			MaterialParams layerParams   = bMaterialParams[materialIndex + layerIndex];
			MaterialState  layerMaterial = evaluateMaterialLayer( layerParams, layerState, state );
			MaterialComposite( layerParams, state, material, layerMaterial, layerIndex );
		}
	#endif
	
	//merge material state into fragment state
	evaluateMaterialMerge( material, state );
}

vec4 runEffect(LayerState layerState)
{
	#ifdef MATERIAL_DEBUG
		if( sizeof( MaterialParams ) != uMaterialParamsSize )
		{ return vec4( 1.0, 0.0, 1.0, 1.0 ); }
	#endif
		
	const uint objectIndex   = 0;
	const uint materialIndex = 0;
	MaterialParams params = bMaterialParams[materialIndex];

	//default state values
	FragmentState state = newFragmentState();
	state.vertexPosition = layerState.position;
	state.objectID = objectIndex;
	state.transform = submatrix3x4( uModelTransform );
	state.transformInverse = submatrix3x4( uModelTransformInverse );
	state.transformInverseTranspose = transpose3x3( state.transformInverse );
	vec3 eye = uLightSpaceCameraPosition.xyz - uLightSpaceCameraPosition.w*state.vertexPosition;
	state.vertexEye = normalize( eye );
	state.vertexEyeDistance = length( eye );
	state.vertexColor = vec4(1.0, 1.0, 1.0, 1.0);
	state.vertexNormal = layerState.normal;
	state.vertexTangent = layerState.tangent;
	state.vertexBitangent = layerState.bitangent;

	#if defined(EFFECT_PLANAR) || defined(EFFECT_TRIPLANAR)
		#if LAYER_OUTPUT == CHANNEL_NORMAL			
			// generate planar/triplanar tangent spaces				
			mat4 meshTBN = _identity();
			col0(meshTBN).xyz = state.vertexTangent;
			col1(meshTBN).xyz = state.vertexBitangent;
			col2(meshTBN).xyz = state.vertexNormal;

			mat4 surfTBN = _identity();
			projectPremultTangents( surfTBN, meshTBN, layerState.plane );
			state.vertexTangent =	col0(surfTBN).xyz;
			state.vertexBitangent = col1(surfTBN).xyz;
			state.vertexNormal =	col2(surfTBN).xyz;
			#ifdef EFFECT_PLANAR
				//this is needed to ensure planar projection matches with 404 --KK
				vec3 planeNorm = cross(layerState.plane.U, layerState.plane.V);
				float planeNormDot = dot(planeNorm, layerState.normal);
				float bitMult = mix(sign(planeNormDot), 1.0, step(0.001, planeNormDot));
				state.vertexBitangent *= bitMult;		
			#endif
		#endif
	#endif

	#if !defined(EFFECT_POSITIONAL)
		// apply UDIM scale/bias
		layerState.texCoord += vec2(uTileCoords);
	#endif

    state.vertexTexCoordBase = vec4( layerState.bufferCoord, packTextureGrads( makeDifferential( layerState.dBufferCoordDx, layerState.dBufferCoordDy ) ) );
	state.vertexTexCoord.uvCoord = vec4( layerState.texCoord, packTextureGrads( makeDifferential( layerState.dUVdx, layerState.dUVdy ) ) );
	state.vertexTexCoordSecondary = vec4( layerState.texCoord, packTextureGrads( makeDifferential( layerState.dUVdx, layerState.dUVdy ) ) );

	state.screenCoord = uint2( layerState.pixelCoord );
	state.screenTexCoord = vec2( layerState.pixelCoord ) * uScreenTexCoordScaleBias.xy + uScreenTexCoordScaleBias.zw;
	state.normal = normalize( state.vertexNormal );

	#ifdef TextureInitialize
		TextureInitialize( state );
	#endif
	
	evaluateMaterial( materialIndex, params, layerState, state );

	return state.output0;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ 
#if LAYER_OUTPUT == CHANNEL_NORMAL		
		//un-texture-matrix
		state.result.rgb = normalize( mulVec( uTextureMatrixInv, state.result.rgb ) );
		state.result.rgb = 0.5 * state.result.rgb + vec3(0.5,0.5,0.5);
#endif

	state.result = materialSurfaceAdjust( state, state.result );
	#ifdef SPLINE_CONTOUR
		#if (LAYER_OUTPUT == CHANNEL_BUMP || LAYER_OUTPUT == CHANNEL_DISPLACEMENT)
			float contour = state.splineContourHeight;
			state.result.r += 1.0 * (contour - 0.5) * uContourAmplitude;
		#endif
	#endif	//SPLINE_CONTOUR

	return state.result;

}
