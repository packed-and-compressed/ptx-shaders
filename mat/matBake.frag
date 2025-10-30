#if !defined(Lighting) || defined(ShadowCatcher)
	#undef ReflectionPrecompute
	#undef ReflectionPrecomputeSecondary
#endif
#include "matEvaluate.frag"
#include "binding.comp"
#include "../bake/intersectionData.frag"
#include "../bake/dither.frag"

uniform vec4	uLightSpaceCameraPosition;
uniform vec4	uScreenTexCoordScaleBias;

uniform vec4	uBakeBackgroundColor;
uniform uint	uBakeDither;
uniform uint	uBakeSeed;
uniform uint	uBakeSeparateLayers;

BEGIN_PARAMS
	INPUT0(vec3,fPosition)
	INPUT1(vec4,fColor)
	INPUT2(vec3,fTangent)
	INPUT3(vec3,fBitangent)
	INPUT4(vec3,fNormal)
	INPUT5(vec4,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 finalColor = vec4(0,0,0,0);
	uint finalMeshIndex = 0;

	//load our ray hit
	uint2 pixelCoord = uint2( IN_POSITION.xy );
	vec2 packedHit = loadPackedHit( pixelCoord ).xy;

	//load our bake hit geometry
	BakeHit h;
	if( loadIntersection( h, pixelCoord, packedHit ) )
	{
		//load material params
		uint materialIndex = 0;
		if( getMaterialBinding( h.hitShadingGroupObjectID, materialIndex ) )
		{
			//initialize fragment state based on intersection
			FragmentState state = newFragmentState();
			state.bakePass = uBakeSeed;
			state.rng = rngInit( ushort2(pixelCoord), state.bakePass );
			state.objectID = h.hitMeshIndex;
			state.transform = submatrix3x4( h.hitTransform );
			state.transformInverse = submatrix3x4( transpose( h.hitTransformInverseTranspose ) );
			state.transformInverseTranspose = submatrix3x3( h.hitTransformInverseTranspose );
			state.vertexPosition = h.hitPosition;
			state.vertexEye = normalize( h.hitNormal );
			state.vertexEyeDistance = 1.0;
			state.vertexColor = h.hitColor;
			state.vertexNormal = h.hitNormal;
			state.vertexTangent = h.hitTangent;
			state.vertexBitangent = h.hitBitangent;
			state.frontFacing = true;
			state.screenCoord = pixelCoord;
			state.screenTexCoord = IN_POSITION.xy * uScreenTexCoordScaleBias.xy + uScreenTexCoordScaleBias.zw;
			state.screenDepth = IN_POSITION.z;
			state.primitiveID = h.hitTriangleIndex;
			state.normal = normalize( state.vertexNormal );
			state.geometricNormal = h.hitGeometricNormal;
			state.triangleBarycentrics = h.hitBarycenter;
			state.vertexTexCoord.uvCoord =
			state.vertexTexCoordBase = vec4( h.hitTexCoord, 0, 0 );
			state.vertexTexCoordSecondary = vec4( h.hitTexCoord, 0, 0 ); //hit load doesn't contain secondary texcoords yet -jdr
		
			#ifdef TextureInitialize
				TextureInitialize( bRenderables[ h.hitMeshIndex ], state );
			#endif

			evaluateMaterial( materialIndex, state );
			state.vertexPosition = fPosition;
			state.vertexNormal = fNormal;
			state.vertexTangent = fTangent;
			state.vertexBitangent = fBitangent;
			state.vertexColor = fColor;
			BakeFinalize(state);

			finalColor = state.output0;
			finalMeshIndex = h.hitMeshIndex+1;
		}
	}

	//completely omit "missed" pixels
	if( finalColor.a <= 0.0 )
	{ discard; }

	if( uBakeSeparateLayers )
	{
		//final alpha output is mesh index in low byte and transparency in high byte
		finalMeshIndex |= uint( finalColor.a * 255.0 ) << 8;
		finalColor.a = float(finalMeshIndex) / 65535.0;
	}
	else
	{
		//add in background color to the extent the sample is still transparent
		finalColor.rgb += uBakeBackgroundColor.rgb * (1.0 - finalColor.a);
	}

	if( uBakeDither )
	{ finalColor.rgb = dither8bit( finalColor.rgb, pixelCoord ); }

	//final result
	OUT_COLOR0 = finalColor;
}
