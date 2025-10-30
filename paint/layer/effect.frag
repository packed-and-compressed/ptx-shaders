#include "layer.sh"
#include "data/shader/common/projector.sh"

#include "remap.frag"

#include "data/shader/common/differential.sh"

#ifndef CPR_METAL
vec4 runEffect(LayerState state);
vec4 finalizeEffect(LayerState state, inout float _blendAmount);
void convertTangentSpace(inout vec4 result, vec2 dUVx, vec2 dUVy);
#endif

#ifdef LAYER_COMPUTE
	COMPUTE_HEADER
#else
	HINT_EARLYDEPTHSTENCIL
	BEGIN_PARAMS
#ifdef MATERIAL_PASS_PAINT
	INPUT0(vec3,fPosition)
	INPUT1(vec4,fColor)
	INPUT2(vec3,fTangent)
	INPUT3(vec3,fBitangent)
	INPUT4(vec3,fNormal)
	INPUT5(vec4,fTexCoord)
#else

		INPUT0( vec2, fBufferCoord )
	#if defined(EFFECT_POSITIONAL)
		INPUT1( vec3, fPosition )
		INPUT3( vec3, fNormal )
		INPUT4( vec3, fTangent )
		INPUT5( vec3, fBitangent )	
	#endif
#endif	//MATERIAL_PASS_PAINT

		OUTPUT_COLOR0( vec4 )
	END_PARAMS
#endif //LAYER_COMPUTE
{
	//gather mask and geometry state.  early-outs can happen here!
#if defined( MATERIAL_PASS_PAINT )
	//this is pulled from mat.frag.  It ensures we have an accurate buffer coordinate 
	//otherwise, masking/blending is really messed up with UV-projected materials if the material is scaled --KK
	vec2 fBufferCoord = IN_POSITION.xy * uScreenTexCoordScaleBias.xy + uScreenTexCoordScaleBias.zw;
#endif
	float layerMask = getLayerMask(fBufferCoord.xy);

	vec3 fWorldPosition = vec3(0,0,0);

#if defined(LAYER_COMPUTE) || defined(RASTER_IN_PLACE)

	#ifdef COMPUTE_LOAD_STORE
		//we may be able to quit early after reading only the mask
		if(layerMask == 0.0) 
		{ EARLY_OUT; }
	#endif
#else	//compute or rip not defined
		vec3 deltaPx = vec3(uOutputSizeInv.x * 2.0, 0.0, 0.0);
		vec3 deltaPy = vec3(0.0, uOutputSizeInv.y * 2.0, 0.0);
#endif

#if !defined(EFFECT_POSITIONAL)
	#if defined(MATERIAL_PASS_PAINT) && defined(LAYER_COMPUTE)
		#define NEED_FAKE_GEOMETRY
	#elif !defined(MATERIAL_PASS_PAINT)
		#define NEED_FAKE_GEOMETRY  
	#endif
#endif

#ifdef NEED_FAKE_GEOMETRY
	//fake geometry data if necessary
	vec3 fNormal = vec3(0.0, 0.0, 1.0);
	vec3 fTangent = vec3(1.0, 0.0, 0.0);
	vec3 fBitangent = vec3(0.0, 1.0, 0.0);
	vec3 fPosition = vec3(fBufferCoord.x * 2.0 - 1.0, fBufferCoord.y * 2.0 - 1.0, 0.0);
	fWorldPosition = fPosition;
#endif
	vec2 tc = fBufferCoord.xy;

	LayerState state = getLayerStateNoMask(tc, fTangent, fBitangent, fNormal);
	state.layerMask = layerMask;
	state.position = fPosition;
	state.worldPosition = fWorldPosition;

	bool mappedResult = mapCompositeArea(state);
	if(mappedResult == false)
	{
		#ifdef RASTER_IN_PLACE
			return;
		#else
			//raster = no change, just write the previous result
			#ifndef PAINT_COMPOSITE
				writeOutput(state.layerBacking);
				return;
			#endif
		#endif
	}
	#if defined(EFFECT_POSITIONAL)
	#ifdef RASTER_IN_PLACE
		vec3 deltaPx = dFdx(fPosition);
		vec3 deltaPy = dFdy(fPosition);
	#endif
		state.dPosdx = deltaPx;
		state.dPosdy = deltaPy;
		vec3 P, T, B, N;		
			P = state.position.xyz;			
			T = state.tangent;
			B = state.bitangent;
			N = state.normal;
		#ifdef MATERIAL_PASS_PAINT
			P = mulPoint( uModelView, P ).xyz;
		#endif

/////// TRIPLANAR //
		#ifdef EFFECT_TRIPLANAR
			#ifdef MATERIAL_PASS_PAINT
				#if LAYER_OUTPUT == CHANNEL_NORMAL
					T = normalize( mulVec( uModelViewIT, T ) );
					B = normalize( mulVec( uModelViewIT, B ) );
				#endif			
				N = normalize( mulVec( uModelViewIT, N ) );	
			#endif
			#ifdef USE_INPUT_NORMAL
				vec3 inputNormal = sampleInputVector( INPUT_NORMAL, state.bufferCoord ).xyz;				
				TriplanarProjector p = getTriplanarProjectorLod( P, N, inputNormal, createTangentBasis( T, B, N ), deltaPx, deltaPy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation, uTriplanarFade );
			#else
				TriplanarProjector p = getTriplanarProjectorLod( P, N, createTangentBasis( T, B, N ), deltaPx, deltaPy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation, uTriplanarFade );
			#endif
			
			state.tangent = T;
			state.bitangent = B;
			state.normal = N;
			LayerState sx = state;  LayerState sy = state; LayerState sz = state;
			
			sx.plane = p.triplaneX;
			sx.texCoord = p.uvX.xy;
			sx.dUVdx = unpackTextureGrad( p.uvX.z );
			sx.dUVdy = unpackTextureGrad( p.uvX.w );
			
			sy.plane = p.triplaneY;
			sy.texCoord = p.uvY.xy;
			sy.dUVdx = unpackTextureGrad( p.uvY.z );
			sy.dUVdy = unpackTextureGrad( p.uvY.w );
			
			sz.plane = p.triplaneZ;
			sz.texCoord = p.uvZ.xy;
			sz.dUVdx = unpackTextureGrad( p.uvZ.z );
			sz.dUVdy = unpackTextureGrad( p.uvZ.w );

			vec4 vx = runEffect(sx);
			vec4 vy = runEffect(sy);
			vec4 vz = runEffect(sz);

			#if LAYER_OUTPUT == CHANNEL_NORMAL || LAYER_OUTPUT == CHANNEL_ANISO_DIR
				state.result = triplanarMixNormals( p, vx, vy, vz );
			#else
				state.result = triplanarMix( p, vx, vy, vz );
			#endif

/////// PLANAR //
		#elif defined(EFFECT_PLANAR)
			#ifdef MATERIAL_PASS_PAINT
				#if LAYER_OUTPUT == CHANNEL_NORMAL
					T = normalize( mulVec( uModelViewIT, T ) );
					B = normalize( mulVec( uModelViewIT, B ) );
				#endif			
				N = normalize( mulVec( uModelViewIT, N ) );	
			#endif

			#if defined(USE_INPUT_NORMAL)
				vec3 iNormal = sampleInputVector( INPUT_NORMAL, state.texCoord ).xyz;
				PlanarProjector p = getPlanarProjectorLod( P, T, B, N, iNormal, deltaPx, deltaPy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation );
			#else
				PlanarProjector p = getPlanarProjectorLod( P, T, B, N, deltaPx, deltaPy, uTextureScaleBias, uTextureRotation, uMaterialUvScaleBias, uMaterialUvRotation );
			#endif
	
			state.tangent = T;
			state.bitangent = B;
			state.normal = N;

			state.texCoord = p.uv.xy;
			state.dUVdx = unpackTextureGrad( p.uv.z );
			state.dUVdy = unpackTextureGrad( p.uv.w );
			state.plane = p.plane;
			
			#if LAYER_OUTPUT == CHANNEL_NORMAL
				state.result = planarMixNormals(p, runEffect(state) );
			#else
				state.result = planarMix(p, runEffect(state) );
			#endif

/////// POSITIONAL //
		#else	//positional but not triplanar or planar (probably volumetric, but up to the effect itself)
			state.result = runEffect(state);

		#endif
	#else // !POSITIONAL
		state.result = runEffect(state);
	#endif
	
	#ifdef REMAP_COMPOSITE
		convertTangentSpace(state.result, state.dUVdx, state.dUVdy);
	#endif
	
	//this step is for any processing that happens after triplanar mixing is performed
	float blendAmount = 1.0;	//allows the effect to tell us if this is a pre-pass
	state.result = finalizeEffect(state, blendAmount);
	
	#ifdef PAINT_COMPOSITE
		paintStrokeComposite(state.bufferCoord, state.pixelCoord, state.result);
		blendAmount = 0.0;	//no external composite with painting
	#endif //PAINT_COMPOSITE
	//individual effects can apply for a no-dither permit by defining NO_DITHER at the top of their shader file
	#ifdef NO_DITHER
		writeOutput(mix(formatOutputColor( uOutputFormat, state.result ), compositeLayerStateNoDither( state ), blendAmount));
	#else
		writeOutput(mix(formatOutputColor( uOutputFormat, state.result ), compositeLayerState( state ), blendAmount));
	#endif
}

//rotates normals for transformed projection (fit-to-brush or spline-space)
void convertTangentSpace(inout vec4 result, vec2 dUVx, vec2 dUVy)
{
#if defined(REMAP_COMPOSITE ) && LAYER_OUTPUT == CHANNEL_NORMAL
#ifdef MATERIAL_PASS_PAINT
	vec3 norm = result.rgb;
#else
	vec3 norm = result.rgb * 2.0 - 1.0;
#endif
	float mag = length(norm.xy);

	//construct a UV transform from our texture derivatives to transform our normals
	mat2 UVMat;
	UVMat[0][0] = dUVx.x * uNormalMapAspect;
	UVMat[0][1] = dUVy.x * uNormalMapAspect;
	UVMat[1][0] = dUVx.y;
	UVMat[1][1] = dUVy.y;
	
	norm.xy = vec2(norm.x * UVMat[0][0]+ norm.y * UVMat[1][0], norm.x * UVMat[0][1] + norm.y * UVMat[1][1]);
	norm.xy *= vec2(uOutputSize.yx);
	norm.xy = norm.xy / max(length(norm.xy), 0.00001) * mag;
	
#ifdef MATERIAL_PASS_PAINT
	result.rgb = norm.rgb;
#else
	result.rgb = norm.rgb * 0.5 + 0.5;
#endif	//MATERIAL_PASS_PAINT

#endif	//REMAP_COMPOSITE && CHANNEL_NORMAL
}

