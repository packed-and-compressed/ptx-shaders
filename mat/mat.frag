#include "renderable.frag"
#if defined( COMPUTE_MOTION_VECTOR )
#include "data/shader/common/motion.sh"
#endif

#if !defined(Lighting) || defined(ShadowCatcher)
	#undef ReflectionPrecompute
	#undef ReflectionPrecomputeSecondary
#endif
#include "matEvaluate.frag"

uniform vec4	uLightSpaceCameraPosition;
uniform vec4	uScreenTexCoordScaleBias;

uniform uint2	uMaterialBinding;

void evaluateLighting( inout FragmentState state )
{
	#ifdef Lighting
		Lighting(state);
	#else
		#ifdef Diffusion
			Diffusion(state);
		#endif
		#ifdef Reflection
			Reflection(state);
		#endif
		#ifdef OcclusionLighting
			OcclusionLighting(state);
		#endif	
		#ifdef CavityLighting
			CavityLighting(state);
		#endif
	#endif
	#ifdef Transmission
		Transmission(state);
	#endif
	#ifdef TransparencyLighting
		TransparencyLighting(state);
	#endif
}

BEGIN_PARAMS
	INPUT0(vec3,fPosition)
	INPUT1(vec4,fColor)
	INPUT2(vec3,fTangent)
	INPUT3(vec3,fBitangent)
	INPUT4(vec3,fNormal)
	INPUT5(vec4,fTexCoord)
	#if defined(COMPUTE_MOTION_VECTOR)
		INPUT6(vec3,fVertexPosition)
	#endif
	#if defined(USE_BARYCENTRICS)
		#if (!defined(COMPUTE_MOTION_VECTOR)) && defined(EMULATE_BARYCENTRICS)
			INPUT6(vec2,fBarycentrics)
		#elif defined(COMPUTE_MOTION_VECTOR) && defined(EMULATE_BARYCENTRICS)
			INPUT7(vec2,fBarycentrics)
		#else
			INPUT_BARYCENTRICS(fBarycentrics)
		#endif
	#endif
	OUTPUT_COLOR0(vec4)
	#if   defined(USE_OUTPUT1)
		OUTPUT_COLOR1(vec4)
	#elif defined(USE_OUTPUT1_UINT)
		OUTPUT_COLOR1(uint4)
	#endif
	#ifdef USE_OUTPUT2
		OUTPUT_COLOR2(vec4)
	#endif
	#ifdef USE_OUTPUT3
		OUTPUT_COLOR3(vec4)
	#endif
	#ifdef USE_OUTPUT4
		OUTPUT_COLOR4(vec4)
	#endif
	#ifdef USE_OUTPUT5
		OUTPUT_COLOR5(vec4)
	#endif
	#ifdef USE_OUTPUT6
		OUTPUT_COLOR6(vec4)
	#endif
	#ifdef USE_OUTPUT7
		OUTPUT_COLOR7(vec4)
	#endif
END_PARAMS
{
	MATERIAL_DEBUG_CHECK_PARAMS();

	//fetch material binding
	uint objectIndex   = uMaterialBinding.x;
	uint materialIndex = uMaterialBinding.y;
	
	//fetch renderable instance
	Renderable renderable = bRenderables[objectIndex];

	//default state values
	FragmentState state = newFragmentState();
	state.objectID = objectIndex;
	state.transform = unpack( renderable.transform );
	state.transformInverse = unpack( renderable.transformInverse );
	state.transformInverseTranspose = transpose3x3( state.transformInverse );
	state.vertexPosition = fPosition;

	#if defined( COMPUTE_MOTION_VECTOR )
		state.vertexVelocity = computeVelocity( fVertexPosition.xyz );
		state.vertexMotionNDC = computeMotionNDC( fVertexPosition.xyz );
	#endif
	
	vec3 eye = uLightSpaceCameraPosition.xyz - uLightSpaceCameraPosition.w*state.vertexPosition;
	state.vertexEye = normalize( eye );
	state.vertexEyeDistance = length( eye );
	state.vertexColor = fColor;
	#ifdef ALWAYS_FRONTFACING
		state.vertexNormal = fNormal;
	#else
		state.frontFacing = IN_FRONTFACING;
		state.vertexNormal = IN_FRONTFACING ? fNormal : -fNormal;
	#endif
	state.vertexTangent = fTangent;
	state.vertexBitangent = fBitangent;
	state.screenCoord = uint2( IN_POSITION.xy );
	state.screenTexCoord = IN_POSITION.xy * uScreenTexCoordScaleBias.xy + uScreenTexCoordScaleBias.zw;
	state.screenDepth = IN_POSITION.z;
	state.sampleCoverage = IN_COVERAGE;
	state.primitiveID = IN_PRIMITIVEID;
	state.normal = normalize( state.vertexNormal );
	state.geometricNormal = normalize( cross( ddy( fPosition ), ddx( fPosition ) ) );
	#if defined(USE_BARYCENTRICS)
		#if defined(EMULATE_BARYCENTRICS)
			state.triangleBarycentrics = vec3( fBarycentrics, 1.0 - fBarycentrics.x - fBarycentrics.y );
		#else
			state.triangleBarycentrics = fBarycentrics;
		#endif
	#endif
	state.vertexTexCoordBase = vec4( fTexCoord.xy, 0, 0 );
	state.vertexTexCoordSecondary = vec4( fTexCoord.zw, 0, 0 );

	#ifdef TextureInitialize
		TextureInitialize( renderable, state );
	#endif

	evaluateMaterial( materialIndex, state );
    evaluateLighting( state );
	
	#ifdef Output
		Output(state);
	#endif

	OUT_COLOR0 = state.output0;

	#if   defined(USE_OUTPUT1)
		OUT_COLOR1 = state.output1;
	#elif defined(USE_OUTPUT1_UINT)
		OUT_COLOR1 = asuint( state.output1 );
	#endif

	#ifdef USE_OUTPUT2
		OUT_COLOR2 = state.output2;
	#endif

	#ifdef USE_OUTPUT3
		OUT_COLOR3 = state.output3;
	#endif

	#ifdef USE_OUTPUT4
		OUT_COLOR4 = state.output4;
	#endif

	#ifdef USE_OUTPUT5
		OUT_COLOR5 = state.output5;
	#endif

	#ifdef USE_OUTPUT6
		OUT_COLOR6 = state.output6;
	#endif

	#ifdef USE_OUTPUT7
		OUT_COLOR7 = state.output7;
	#endif

}
