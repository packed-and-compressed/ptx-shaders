#ifndef LAYER_SH
#define LAYER_SH

#include "../../common/util.sh"
#include "../../common/projectorplane.sh"
#include "layerbuffer.sh"
#include "layerblend.sh"
#include "layerformat.sh"
#include "layernoise.sh"
#include "layerinput.sh"

#include "data/shader/common/tangentbasis.sh"

#define CHANNEL_NORMAL				1
#define CHANNEL_ALBEDO				2
#define CHANNEL_SPECULAR			3
#define CHANNEL_GLOSS				4
#define CHANNEL_ROUGHNESS			5
#define CHANNEL_METALNESS			6
#define CHANNEL_OCCLUSION			7
#define CHANNEL_CAVITY				8
#define CHANNEL_OPACITY				9
#define CHANNEL_DISPLACEMENT		10
#define CHANNEL_ALBEDO_METAL_DEPRECATED		11
#define CHANNEL_BUMP				12
#define CHANNEL_EMISSIVE			13
#define CHANNEL_SCATTER				14
#define CHANNEL_TRANSMISSION_MASK		15
#define CHANNEL_ANISO_DIR			16
#define CHANNEL_FUZZ				17
#define CHANNEL_SHEEN				18
#define CHANNEL_SHEEN_ROUGHNESS		19
#define CHANNEL_CUSTOM				20
#define CHANNEL_REFRACTION_DEPTH	21
#define CHANNEL_GLINT				22
#define CHANNEL_GLINT_ROUGHNESS		23


//paint/fill with materials will pre-fetch the mask for an early out so we wont need to re-read it
#if defined(MATERIAL_PASS_PAINT) && defined (COMPUTE_LOAD_STORE) && defined (LAYER_MASK)
	#define PRE_FETCH_MASK
#endif

//////

#ifdef LAYER_COMPUTE
	//watermark for testing, once we dont need the watermark, we can use
	#define writeOutput(result) imageStore(uResult, cs.coord, result);
	//#define writeOutput(result) \
	{\
		float _sr = 30.0;\
		float _r = length(vec2(cs.localCoord) - _sr * 1.1);\
		vec4 r2 = mix(result, vec4(1.0, 0.5, 0.0, 1.0), 1.0-smoothstep(-2.0, 0.0, _r-_sr));\
		r2.x += float(cs.redirectedSector) * 0.00;\
		r2 = mix(r2, result, 0.65);\
		r2 = mix(r2, vec4(0.0, 0.0, 0.0, 1.0), (1.0-smoothstep(0.0, 2.0, _r-_sr)) * smoothstep(-2.0, 0.0, _r-_sr));\
		r2 = result;\
		imageStore(uResult, cs.coord, r2);\
	}
	#define COMPUTE_HEADER COMPUTE(8,8,1)
#elif defined(RASTER_IN_PLACE)
		//raster-in-place output
	#define writeOutput(result) imageStore(uResult, ushort2(IN_POSITION.xy), result); OUT_COLOR0 = result;	
#else
	#define writeOutput(result) OUT_COLOR0 = result;
#endif

#ifdef LAYER_BACKING
	USE_LAYER_BUFFER2D( tLayerBacking );
#endif

#ifdef LAYER_MASK
	#ifdef SPARSE_LAYER_MASK
		USE_TEXTURE2DARRAY(tLayerMask);
		USE_TEXTURE2D(tMaskLUT);
	#else
		USE_LAYER_BUFFER2D(tLayerMask );
	#endif
#endif

#ifdef CARVE
	#ifdef SPARSE_LAYER_CARVE_MASK
		USE_TEXTURE2DARRAY(tCarveLayerMask);
		USE_TEXTURE2D(tCarveMaskLUT);
	#else
		USE_LAYER_BUFFER2D(tCarveLayerMask );
	#endif
#endif 

USE_TEXTURE2D(tGradientMask);
uniform vec3 uRangeCarveMask;

//result buffer in compute mode or RIP mode
#ifdef RASTER_IN_PLACE
	USE_LOADSTORE_TEXTURE2D(float, uResult, 1);
#endif

#ifdef LAYER_COMPUTE
	USE_LOADSTORE_TEXTURE2D(float, uResult, 0);
	uniform uint2 uComputeOffset;
	#ifdef COMPUTE_SPARSE_RENDER
		USE_RAWBUFFER( bSparseIndirection );
//		uniform uint	uSparseIndirection[64];	//256 BYTES to hold sector indirection
	#endif
#endif

#ifdef NO_SPARSE_TEXTURE_BRANCH

/* 
tex coord adjustment in this function:  tex coords very close to 0.0 can arise when viewport resolution is
not divisible by sparse size (16x16) and renders and dont come out right
even with correct sampler settings.  If this happens, we
need to slightly adjust our texture read (by half a pixel or less) to avoid the situation --KK
*/ 
#define sampleSparseTexture(samplerTex, atlasTex, texCoord, valueV4)\
{ \
	int w; int h; int mips;\
	imageSize2D(atlasTex, w, h, mips);\
	uint2 tCoord = uint2(texCoord.x * w, texCoord.y * h);\
	float atlasSlice = imageLoad(atlasTex, tCoord).x * 65535.0;\
	vec3 tc = vec3(fract(texCoord * vec2(w, h)), atlasSlice);\
	vec2 adjust =  step(tc.xy, 0.00002);  \
	tc.xy += uOutputSizeInv * vec2(w, h) * adjust * 0.5;\
	valueV4 = texture2DArrayLod(samplerTex, tc, 0); \
}

#else
#define sampleSparseTexture(samplerTex, atlasTex, texCoord, valueV4)\
{ \
	int w; int h; int mips;\
	imageSize2D(atlasTex, w, h, mips);\
	uint2 tCoord = uint2(texCoord.x * w, texCoord.y * h);\
	float atlasSlice = imageLoad(atlasTex, tCoord).x * 65535.0;\
	if(atlasSlice < 65000.0)\
	{ \
		vec3 tc = vec3(texCoord * vec2(w, h), atlasSlice);\
		valueV4 = texture2DArrayLod(samplerTex, tc, 0.0); \
	}\
	else\
	{ valueV4 = vec4(0.0, 0.0, 0.0, 0.0); }\
}
#endif

uniform int		uChannel;
uniform vec2	uOutputSize;
uniform vec2	uOutputSizeInv;

uniform float	uLayerBlendOpacity;
uniform vec4	uLayerBackingColor;
uniform float	uLayerMaskValue;
uniform float	uLayerClipMasking;

uniform vec4	uTextureScaleBias;
uniform vec2 	uTextureRotation;
uniform mat4	uTextureMatrixInv;
uniform vec3	uLayerTangentParams;
uniform float 	uNormalMapAspect;		//used for transforming normal maps based on UV derivatives

uniform vec2	uLayerDitherSeed;

//moved here because its needed for scaling UVs with material projection --KK
// UV scale, bias and rotation from the material system, to be used if mat.vert texture coordinates are overwritten
uniform vec4	uMaterialUvScaleBias;
uniform vec2	uMaterialUvRotation;
uniform vec4	uScreenTexCoordScaleBias;
uniform float	uTriplanarFade;

#ifdef LAYER_COMPUTE

struct ComputeState
{
	uint2 localCoord;	//coord within sector.  used for debugging only
	uint2 coord;	//buffer coord were writing to
	vec2 texCoord;	//texture coordinate we should be using
	uint sector;	//which one of 256 sparse sectors?
	uint redirectedSector;
};

ComputeState getComputeState(uint3 threadID)
{
	ComputeState state;
	state.coord = threadID.xy + uComputeOffset;

	//when doing a sparse render, an indirection map tells us which sector of
	//the UV layout this thread should work on
#ifdef COMPUTE_SPARSE_RENDER
	uint sectorSizeX = SPARSE_SECTOR_WIDTH;
	uint sectorSizeY = SPARSE_SECTOR_HEIGHT;
	
	state.sector = (threadID.x + uComputeOffset.x) / (sectorSizeX+2*SPARSE_PADDING) + 
		(15-(threadID.y+uComputeOffset.y) / (sectorSizeY+2*SPARSE_PADDING)) * 16;
	state.redirectedSector = state.sector;
	state.sector = threadID.z;
	uint indir = asuint( asint(rawLoad( bSparseIndirection, state.sector/4 )));

	state.redirectedSector = indir;

	uint subspot = state.sector%4;
	
	//find our byte amongst the 4 of this uint
	state.sector = (indir >> (subspot * 8)) & 255U;
	
	uint sectorX = state.sector%16;
	uint sectorY = 15-(state.sector >> 4U);		//divide by 16 to get our row
	state.coord.x = state.coord.x % (sectorSizeX+2*SPARSE_PADDING) + sectorX * sectorSizeX - SPARSE_PADDING;
	state.coord.y = state.coord.y % (sectorSizeY+2*SPARSE_PADDING) + sectorY * sectorSizeY - SPARSE_PADDING;
	
	//dont try to write off-image
	#if(SPARSE_PADDING != 0)
		state.coord.x = min(state.coord.x, uint(uOutputSize.x));
		state.coord.y = min(state.coord.y, uint(uOutputSize.y));	
	#endif

#else
	uint sectorSizeX = int(uOutputSize.x * 0.062501);
	uint sectorSizeY = int(uOutputSize.y * 0.062501);
	
#endif

	state.texCoord = (vec2(state.coord) + 0.5) / vec2(uOutputSize);
	state.localCoord = state.coord % uint2(256, 256);
	return state; 
}

#endif


//this allows a one-line early-out for compute shaders if the mask value is zero.  It can be
//a significant performance boost even with sparse rendering.  This is not in getLayerState() because
//a compute shader has no [discard].

#ifdef COMPUTE_LOAD_STORE
#ifdef LAYER_COMPUTE
	#define EARLY_OUT return;
#elif defined(RASTER_IN_PLACE)
	#define EARLY_OUT discard;
#endif
#else
#define EARLY_OUT	//nothing for raster
#endif


struct LayerState
{
	vec2	texCoord;		//sample coordinate (may be projected and transformed)
	vec2	bufferCoord;	//original UV  
	vec2	pixelCoord;		//pixel coordinate on output buffer
	vec4	layerBacking;
	float	layerMask;
	vec4	result;

	//tangent-space vectors of the surface we are currently rendering with
	vec3	tangent;
	vec3	bitangent;
	vec3	normal;
	vec3	position;
	vec3	worldPosition;//original world position not scaled to -1 to +1

#ifdef SPLINE_COMPOSITE	
	//spline data only used for spline rendering
	vec2	splineUV;			//spline-space UV
	
	//parameters derived from the spline contour data texture
	vec2	distortedSplineUV;	//spline texture coordinate, taking into account stetching from the contour
	
	//raw values read from the texture, NOT adjusted uniforms
	float	splineContourHeight; 
	float	splineCorrectedU;
	float	splineContourAO;
	
	
	vec2 	splineTangent;		//direction of the spline	
	vec2	splineBitangent;	//perpendicular axis of the spline
#endif	
	
	ProjectorPlane plane;	//used by the material system

	vec2	dUVdx, dUVdy;					//UV gradient
    vec2	dBufferCoordDx, dBufferCoordDy; //original UV gradient
	
	//used to calculate mipmap level with triplanar/planar projection.  only populated via effect.frag
	//but available elsewhere as a vec3 called "deltaPx" and "delptaPy"
	//unused/unneeded/zero in raster shaders
	vec3	dPosdx, dPosdy;		
};

float	getLayerMask( vec2 texCoord)
{
	float mask = 1.0;
#ifdef LAYER_MASK
	#ifdef SPARSE_LAYER_MASK
		//sparse textureArray lookup
		vec4 sm;
		sampleSparseTexture(tLayerMask, tMaskLUT, frac(texCoord), sm);
		mask = sm.x;
	#else
		//interpret mask (always mono)
		mask = sampleBackingBufferRaw( tLayerMask, texCoord ).x;	
	#endif	//SPARSE_LAYER_MASK	
#else
	mask = uLayerMaskValue;
#endif	// LAYER_MASK && !PRE_FETCH_MASK

#ifdef CARVE

	float carveF = 0.f;
	if( uRangeCarveMask.x==0.f && uRangeCarveMask.y==0.f )
	{ 
		carveF = 1.f; 
	}
	else
	{
		#ifdef SPARSE_LAYER_CARVE_MASK
			//sparse textureArray lookup
			vec4 sm;
			sampleSparseTexture(tCarveLayerMask, tCarveMaskLUT, frac(texCoord), sm);
			carveF = sm.x;
		#else
			//interpret mask (always mono)
			carveF = sampleBackingBufferRaw( tCarveLayerMask, texCoord ).x;	
		#endif	//SPARSE_LAYER_MASK
			
		float low = uRangeCarveMask.x;
		float high = uRangeCarveMask.y;
		float range = max( 0.001f, high - low );

		carveF = texture2DLod( tGradientMask, vec2(0.0, carveF), 0.0 ).x;
		carveF = saturate( ( carveF - low ) / range );
	}

	mask *= carveF;
	
#endif // CARVE

	return mask;
}

LayerState	getLayerState( vec2 texCoord )
{
	// build a LayerState struct out of shader inputs
	LayerState state;
	
	state.texCoord = texCoord;	
	state.bufferCoord = fract(texCoord);		//in case of UDIMs, the buffercoord needs to still be [0, 1]
	state.pixelCoord = state.bufferCoord * uOutputSize;
	
	#ifdef LAYER_BACKING
		state.layerBacking = sampleBackingBuffer( tLayerBacking, state.texCoord );
	#else
		state.layerBacking = formatBackingColor( uBackingFormat, uLayerBackingColor );
	#endif

	state.layerMask = getLayerMask(texCoord);
	
	vec2 tc2 = state.texCoord + vec2(1.0, 0.0) * uOutputSizeInv;
	vec2 tc3 = state.texCoord + vec2(0.0, 1.0) * uOutputSizeInv; 
	
    state.dBufferCoordDx = fract( tc2 ) - state.bufferCoord;
    state.dBufferCoordDy = fract( tc3 )  - state.bufferCoord;
	
	//texture matrix
	state.texCoord = transformUV( state.texCoord, uTextureScaleBias, uTextureRotation );
		
	tc2 = transformUV( tc2, uTextureScaleBias, uTextureRotation );
	tc3 = transformUV( tc3, uTextureScaleBias, uTextureRotation );

	state.dUVdx = tc2-state.texCoord;
	state.dUVdy = tc3-state.texCoord;

	//default is pass-through
	state.result = state.layerBacking;
	
	state.tangent =		vec3(1.0, 0.0, 0.0);
	state.bitangent =	vec3(0.0, 1.0, 0.0);
	state.normal =		vec3(0.0, 0.0, 1.0);

	return state;
}

LayerState getLayerState( vec2 texCoord, vec3 vertexTangent, vec3 vertexBitangent, vec3 vertexNormal )
{	
	LayerState state = getLayerState( texCoord );	
	
	state.tangent = vertexTangent;
	state.bitangent = vertexBitangent;
	state.normal = vertexNormal;
	interpolateTangentBasis( state.tangent, state.bitangent, state.normal, uLayerTangentParams );
	state.plane.U = vertexTangent;
	state.plane.V = vertexBitangent;

	return state;
}


//new API fetches the mask before the rest of the layerstate!
LayerState	getLayerStateNoMask( vec2 texCoord )
{
	// build a LayerState struct out of shader inputs
	LayerState state;
	
	state.texCoord = texCoord;	
	state.bufferCoord = fract(texCoord);		//in case of UDIMs, the buffercoord needs to still be [0, 1]
	state.pixelCoord = state.bufferCoord * uOutputSize;
	
	#ifdef LAYER_BACKING
		state.layerBacking = sampleBackingBuffer( tLayerBacking, state.texCoord );
	#else
		state.layerBacking = formatBackingColor( uBackingFormat, uLayerBackingColor );
	#endif

	vec2 tc2 = state.texCoord + vec2(1.0, 0.0) * uOutputSizeInv;
	vec2 tc3 = state.texCoord + vec2(0.0, 1.0) * uOutputSizeInv;

    state.dBufferCoordDx = fract( tc2 ) - state.bufferCoord;
    state.dBufferCoordDy = fract( tc3 ) - state.bufferCoord;
	
	//a little awkward, but this has to be here for UV projection to look the same as 404 for matrix
	//multiplication order reasons --KK
#if defined( MATERIAL_PASS_PAINT) && !defined(EFFECT_POSITIONAL)
	state.texCoord = transformUV( state.texCoord, uMaterialUvScaleBias, uMaterialUvRotation );
	tc2 = transformUV( tc2, uMaterialUvScaleBias, uMaterialUvRotation );
	tc3 = transformUV( tc3, uMaterialUvScaleBias, uMaterialUvRotation );
#endif
 
	//texture matrix
	state.texCoord = transformUV( state.texCoord, uTextureScaleBias, uTextureRotation );
		
	tc2 = transformUV( tc2, uTextureScaleBias, uTextureRotation );
	tc3 = transformUV( tc3, uTextureScaleBias, uTextureRotation );

	state.dUVdx = tc2-state.texCoord;
	state.dUVdy = tc3-state.texCoord;
	
	//default is pass-through
	state.result = state.layerBacking;
	
	state.tangent =		vec3(1.0, 0.0, 0.0);
	state.bitangent =	vec3(0.0, 1.0, 0.0);
	state.normal =		vec3(0.0, 0.0, 1.0);

	return state;
}

LayerState getLayerStateNoMask( vec2 texCoord, vec3 vertexTangent, vec3 vertexBitangent, vec3 vertexNormal )
{	
	LayerState state = getLayerStateNoMask( texCoord );	
	
	state.tangent = vertexTangent;
	state.bitangent = vertexBitangent;
	state.normal = vertexNormal;
	interpolateTangentBasis( state.tangent, state.bitangent, state.normal, uLayerTangentParams );

	return state;
}



vec4	compositeLayerStateNoDither( LayerState state )
{
	// interpret LayerState struct into one final fragment color, in the formatted output pixel format.
	
	vec4 color;
	color = blend( saturate(state.result), state.layerBacking, state.layerMask * uLayerBlendOpacity );	
	color.a = mix( color.a, saturate(state.layerBacking.a), uLayerClipMasking ); //disables alpha write

	color = formatOutputColor( uOutputFormat, color );	
	return color;
}

vec4	compositeLayerState( LayerState state )
{
	vec4 color;
	color = blend( saturate(state.result), state.layerBacking, state.layerMask * uLayerBlendOpacity);
	color.a = mix( color.a, state.layerBacking.a, uLayerClipMasking ); //disables alpha write
	
	color = formatOutputColor( uOutputFormat, color );	

	#ifdef LAYER_OUTPUT_16BIT
	return color;
	#endif

	#ifdef LAYER_OUTPUT_SRGB
	color.rgb = linearTosRGB( color.rgb );
	#endif

	color.rgb = layerDither8bit( color.rgb, state.pixelCoord.xy + uLayerDitherSeed );
	
	#ifdef LAYER_OUTPUT_SRGB
	color.rgb = sRGBToLinear(color.rgb);
	#endif
	return color;
}


vec4 texture2DAutoLod(LayerBuffer2D tex, vec2 coord, vec2 dUVdx, vec2 dUVdy)
{
//splines and fit-to-brush painting provide their own texture gradients
#if defined(EFFECT_SPLINE_PROJECTION) || defined(PAINT_FIT_TO_BRUSH)
	return textureWithSamplerGrad( tex, uBufferSampler, coord, dUVdx, dUVdy );
#else 
	return textureWithSampler( tex, uBufferSampler, coord);
#endif	//EFFECT_SPLINE_PROJECTION

}
#endif
