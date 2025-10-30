#ifndef CLONE_COMPOSITE_FRAG
#define CLONE_COMPOSITE_FRAG

#define	PI	3.14159265359

uniform vec2	uCloneTexturesSize;
uniform vec2	uCloneCopyTexturesSize;

USE_TEXTURE2D(tPrecomposite);

#include "data/shader/common/util.sh"
#include "data/shader/paint/layer/layer.sh"
#include "data/shader/paint/layer/materialcomposite.frag"
#include "data/shader/paint/clonestamputils.sh"
#include "data/shader/common/udimsample.sh"

USE_TEXTURE2D(tCloneDestTexture);
USE_TYPEDTEXTURE2D( uint, tCloneDestIdsTexture );
USE_TEXTURE2D(tCloneExisting);
USE_TEXTURE2D(tSelection);

void buildNormalRotationMatrix( float srcCos, float srcSin, float destCos, float destSin, inout mat4 cloneTextureMatrixInv )
{
	float A = srcCos * destCos - srcSin * destSin;
	float B = srcCos * destSin + srcSin * destCos;

	cloneTextureMatrixInv = mat4(	A, -B,	0, 0,
									B, A,	0, 0,
									0, 0,	1, 0,
									0, 0,   0, 1 );
}

vec4 updateCloneStampPaintOutput( LayerState layerState, vec3 destUVUp, inout vec4 stroke, inout vec4 existing )
{
	vec4 texSpace = computeUnitModelUVs( layerState.texCoord, uModelUVRange );

	// we change nothing in the target texture
	if( texSpace.x<0.f || texSpace.x>1.f || texSpace.y<0.f || texSpace.y>1.f )
	{ discard; }

	float w = uCloneTexturesSize.x;
	float h = uCloneTexturesSize.y;

	vec4 weight;
	uint4 offsets;
	getBilinearFilteringData( texSpace.xy, w, h, weight, offsets );

	int2 offsetsArray[4] = { int2(offsets.x, offsets.z), int2(offsets.y, offsets.z), int2(offsets.x, offsets.w), int2(offsets.y, offsets.w) };

	vec4 destValues[4];
	uint2 destValuesIds[4];
	vec4 precompValues[4];
	uint4 uvIslandIds;
	uint4 tileIds;
	vec4 fallOffs;
	for( uint i=0; i<4; ++i )
	{
		int2 currentOffsets = offsetsArray[i];

		destValues[i] = imageLoad( tCloneDestTexture, currentOffsets );
		destValuesIds[i] = uint2(imageLoad( tCloneDestIdsTexture, currentOffsets ).xy);

		uvIslandIds[i] = destValuesIds[i].y;
		tileIds[i] = destValuesIds[i].x;

		precompValues[i] = imageLoad( tPrecomposite, currentOffsets );
	}

	int refUVIslandId = -1;
	int refTileId = -1;

	vec4 result = vec4(0,0,0,0);
	stroke = vec4(0,0,0,0);
	float totalW = 0.f;
	for( uint i=0; i<4; ++i )
	{
		if( precompValues[i].x > 0.f ) 
		{ 
			if( refUVIslandId == -1 )
			{ refUVIslandId = uvIslandIds[i]; refTileId = tileIds[i]; }

			float currentW = weight[i];

			if( uvIslandIds[i] == (uint)refUVIslandId && tileIds[i] == refTileId )
			{
				result += destValues[i] * currentW; 
				stroke += precompValues[i] * currentW; 
				totalW += currentW; 
			}
		}
	}

	if( totalW > 0.f )
	{ 
		result /= totalW; 
		stroke /= totalW; 
	}	

	vec2 srcModelUVs = result.xy;

	// alpha must be null if the tile index is out of range
	uint mapIndex;
	int channelCount;
	vec2 mapSize;
	resolveUDIMValues( refTileId, mapIndex, channelCount, mapSize );

	vec4 t = vec4(0.0,0.0,0.0,0.0);
	if( mapIndex )
	{ t = textureWithSampler( resourceByIndex( tGlobalTextures, mapIndex ), sUDIMSampler, srcModelUVs ); }

	vec4 colorOutput = vec4(0.f, 0.f, 0.f, 0.f);
	if( uOutputFormat == FORMAT_RG )
	{
		colorOutput.rgb = t.rrr;
		colorOutput.a = t.g;
	}
	else
	{
		colorOutput.rgb = t.rgb;
		colorOutput.a = t.a;
	}
	
	#if LAYER_OUTPUT == CHANNEL_NORMAL || LAYER_OUTPUT == CHANNEL_ANISO_DIR

	if( length(destUVUp) > 0.f )
	{
		colorOutput.rgb = 2.0 * colorOutput.rgb - 1.0;

		float destCosAngle = dot( normalize( layerState.tangent ), destUVUp );
		float destSinAngle = dot( normalize( layerState.bitangent ), destUVUp );
		float srcNormalRotAngle = (result.w * 2.f - 1.f) * PI;

		mat4 cloneTextureMatrixInv;
		buildNormalRotationMatrix( cos(srcNormalRotAngle), -sin(srcNormalRotAngle), destCosAngle, destSinAngle, cloneTextureMatrixInv );

		vec3 n = colorOutput.rgb;
		colorOutput.rgb = normalize(
				col0(cloneTextureMatrixInv).xyz * n.x +
				col1(cloneTextureMatrixInv).xyz * n.y +
				col2(cloneTextureMatrixInv).xyz * n.z );
					
		colorOutput.rgb = 0.5 * colorOutput.rgb + vec3(0.5,0.5,0.5);
	}
	
	#endif
	
	// Existing
	vec4 texSpaceNoComp = computeUnitModelUVs( layerState.texCoord, uModelUVRangeNoComp );
	vec2 pixelPos = fract(texSpaceNoComp.xy) * uCloneCopyTexturesSize.xy;
	vec2 pixelPosNearestF = clamp( pixelPos, vec2(0.f, 0.f), vec2(max(uCloneCopyTexturesSize.x - 1.f,0.f), max(uCloneCopyTexturesSize.y - 1.f,0.f)) );
	uint2 pixelPosNearestI = uint2( pixelPosNearestF );
	existing = imageLoad( tCloneExisting, pixelPosNearestI );

	return colorOutput;
}

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	INPUT1( vec3, fNormal )
	INPUT2( vec3, fTangent )
	INPUT3( vec3, fBitangent )	
	INPUT4( vec3, fUVUp )

	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	LayerState state = getLayerStateNoMask( fBufferCoord.xy, fTangent, fBitangent, fNormal );

	vec3 destUVUp = vec3(0,0,0);
	#if LAYER_OUTPUT == CHANNEL_NORMAL || LAYER_OUTPUT == CHANNEL_ANISO_DIR
		destUVUp = normalize( fUVUp );
	#endif

	vec4 stroke, existing;
	state.result = updateCloneStampPaintOutput( state, destUVUp, stroke, existing );
	state.result.a *= texture2D(tSelection,fBufferCoord.xy).r;
	if( stroke.r == 0.f )
	{ discard; }

	paintStrokeComposite( state.bufferCoord, ushort2(state.pixelCoord), state.result, stroke, existing );

	OUT_COLOR0 = formatOutputColor( uOutputFormat, state.result );
}

#endif // CLONE_COMPOSITE_FRAG
