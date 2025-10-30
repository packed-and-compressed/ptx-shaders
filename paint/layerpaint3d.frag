#include "stencilsample.frag"
#include "data/shader/common/tangentbasis.sh"

uniform float	uUVStencil;		//are we sampling the stencil in UV space?
uniform ivec2	uTargetSize;		//for smoothing very small brush sizes
uniform int		uBrushFrameCount;

#ifdef CLONE_STAMP_DEST
#include "clonestamputils.sh"
#endif

#include "brushsampling.frag"

uniform float	uNoiseSeed;

#ifdef OUTPUT_UVS
uniform int		uMaterialFrameCount;
uniform int 	uMaterialFrame;		//only one splot in this case
#endif
uniform vec4	uRefNorm[SPLOT_COUNT];			//no falloff (full opacity) at this normal, not necessarily the same as the paint direction
uniform float 	uOpacity[SPLOT_COUNT];
uniform float	uFlow[SPLOT_COUNT]; 
uniform float 	uWarp[SPLOT_COUNT];
uniform float	uHardness[SPLOT_COUNT];
uniform int 	uBrushFrame[SPLOT_COUNT];		//per-splot animation frame
uniform int 	uBrushSeed[SPLOT_COUNT];		//per-splot noise
uniform vec4	uDir[SPLOT_COUNT];
uniform int		uSparseRefValue;
uniform int		uStrokeSampling;			//are we undersampling the stoke for speed?

//for stencil sampling!
#ifdef USE_STENCIL
	#ifdef PER_SPLOT_STENCIL
		uniform mat4	uStencilViewProjectionMatrix[SPLOT_COUNT];
	#else
		uniform mat4 	uStencilViewProjectionMatrix;
	#endif
#endif

#ifndef USE_OVERLAY
USE_LOADSTORE_TEXTURE2D(float, uSparseness, 2);
#endif

#ifdef USE_FALLOFF
uniform float 	uMaxAngle;
uniform float	uFalloffAmount; 
USE_TEXTURE2D(tTSNormalMap);
float calcFalloff(vec3 ref, vec3 test)
{
	float dotProduct = dot(ref, test);
	return angleFalloff(dotProduct, uMaxAngle, uFalloffAmount);
}
#else
#define calcFalloff(r, t) 1.0
#endif

BEGIN_PARAMS
INPUT0(vec3, fNormal)
INPUT1(vec3, fTangent)
INPUT2(vec3, fPosition)
#define SPLOT_TYPE vec4
	INPUT3(SPLOT_TYPE, fBrushCoord0)

#if(SPLOT_COUNT > 1)
	INPUT4(SPLOT_TYPE, fBrushCoord1)
#endif

#if(SPLOT_COUNT > 2)
	INPUT5(SPLOT_TYPE, fBrushCoord2)
#endif
#if(SPLOT_COUNT > 3)
	INPUT6(SPLOT_TYPE, fBrushCoord3)
#endif
#if(SPLOT_COUNT > 4)
	INPUT7(SPLOT_TYPE, fBrushCoord4)
#endif
#if(SPLOT_COUNT > 5)
	INPUT8(SPLOT_TYPE, fBrushCoord5)
#endif
#if(SPLOT_COUNT > 6)
	INPUT9(SPLOT_TYPE, fBrushCoord6)
#endif
#if(SPLOT_COUNT > 7)
	INPUT10(SPLOT_TYPE, fBrushCoord7)
#endif
#if(SPLOT_COUNT > 8)
	INPUT11(SPLOT_TYPE, fBrushCoord8)
#endif
#if(SPLOT_COUNT > 9)
	INPUT12(SPLOT_TYPE, fBrushCoord9)
#endif
#if(SPLOT_COUNT > 10)
	INPUT13(SPLOT_TYPE, fBrushCoord10)
#endif
#if(SPLOT_COUNT > 11)
	INPUT14(SPLOT_TYPE, fBrushCoord11)
#endif
#if(SPLOT_COUNT > 12)
	INPUT15(SPLOT_TYPE, fBrushCoord12)
#endif
#if(SPLOT_COUNT > 13)
	INPUT16(SPLOT_TYPE, fBrushCoord13)
#endif
#if(SPLOT_COUNT > 14)
	INPUT17(SPLOT_TYPE, fBrushCoord14)
#endif
#if(SPLOT_COUNT > 15)
	INPUT18(SPLOT_TYPE, fBrushCoord15)
#endif

#ifdef USE_OVERLAY	
	OUTPUT_COLOR0(vec4)	//single output with overlay
#else
	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
	#ifdef CLONE_STAMP_DEST
		OUTPUT_COLOR2(uint2)
	#endif
#endif	//USE_OVERLAY
END_PARAMS
{
	vec2 texCoord = IN_POSITION.xy/vec2(uTargetSize);

	#ifdef CLONE_STAMP_DEST
		vec2 scaleUV = uModelUVRange.zw;
		vec2 offset = uModelUVRange.xy;
		texCoord = (offset + IN_POSITION.xy * scaleUV) / vec2(uTargetSize);
	#endif

	vec3 stencilCoord = mix(fPosition, vec3(texCoord.xy, 0.0), uUVStencil);	//UV-space stencil?
	
	vec2 total = vec2(0.0, 0.0);	//flow, opacity
//we always have at least one splot, and that splot HAS to run in overlay
	vec3 normHere = fNormal;
	
	float l = length(normHere);
	if(l > 0.0001)
		normHere /= l;
	vec2 sampledCoord = fBrushCoord0.xy/fBrushCoord0.w;

#ifdef USE_FALLOFF
	GET_TEST_NORMAL
#endif

#define targetUV IN_POSITION.xy

//per-splot stenciling ?
#ifdef PER_SPLOT_STENCIL
	#define getStencil(n) vec4 projected = mulPoint(uStencilViewProjectionMatrix[n], stencilCoord);\
	float stencil = sampleStencil(projected.xy/projected.w);
#else
	#define getStencil(n) float stencil = 1.0;
#endif	//PER_SPLOT_STENCIL


#define doSplot(n)\
{\
	vec3 refNorm = REF_NORM(n);\
	getStencil(n)\
	SplotData sd = makeSplotData(targetUV, fBrushCoord##n, uHardness[n], uBrushFrame[n], uBrushSeed[n], \
	uFlow[n] * calcFalloff(refNorm, normHere) * stencil, uOpacity[n], uWarp[n]);\
	sampledCoord = addBrushAlpha(sd, total);\
}


#ifdef USE_W
#define sizeMult(n) fBrushCoord##n.w * strokePadding
#else
#define sizeMult(n) strokePadding
#endif

//early out is different for thin strokes
#ifdef THIN_STROKE
	#define BRUSH_RADIUS(n) (1.0f + 0.45f * (1.1f - uHardness[n])) * 2.f
#else
	#define BRUSH_RADIUS(n) (1.0f + 0.45f * (1.1f - uHardness[n]))
#endif
	
#ifdef CLONE_STAMP_DEST
	#define inSplot(n) 1.f
#else
	#define inSplot(n) (BRUSH_RADIUS(n)*sizeMult(n) * (1.0+warpPadding*uWarp[n]) >= max(abs(fBrushCoord##n.x), abs(fBrushCoord##n.y)))
#endif

//big performance boost by having the early out outside the addBrushAlpha function
#define maybeDoSplot(n) \
 	if( inSplot(n) != 0.0)\
 	{ doSplot(n); } 
	
	
//this optimization doesn't work with screen projection modes, and that's okay.    
#ifndef USE_W
    float minCoord = 900.0;
    //minCord check: check brush coord of every splot.  We may be very far away from any splot (thus all the coordinates are very high)
    #define splotThing(n) minCoord = min(minCoord, fBrushCoord##n.x*fBrushCoord##n.x + fBrushCoord##n.y*fBrushCoord##n.y);
    DO_ALL_SPLOTS
    #undef splotThing

	#ifndef CLONE_STAMP_DEST
	#ifdef THIN_STROKE
		//much greater allowance for very thin strokes or we can get artifacts when we pad the strokebuffer
		if(minCoord > 50.0)
	#else
		if(minCoord > 9.0)
	#endif
	{ discard; }
	#endif
#endif
	#define splotThing(n) maybeDoSplot(n)
	//add in alpha for each splot we're processing
	DO_ALL_SPLOTS

	//read stencil here if no symmetry
#if defined(USE_STENCIL) && !defined(PER_SPLOT_STENCIL)
	vec4 projected = mulPoint(uStencilViewProjectionMatrix, stencilCoord);
	float stencil = sampleStencil(projected.xy/projected.w);
	total.g *= stencil;
#endif


#ifndef USE_OVERLAY	
	
	OUT_COLOR0 = vec4(saturate(total.r),0,0,0);
	float op = max(total.g, 1.0/255.0);
	OUT_COLOR1 = vec4(ceil(max(total.g, total.r)), op, op, op);	//opacity output is also a UV coverage mask

	#ifdef OUTPUT_UVS
		unsigned int matFrameCount = max(uMaterialFrameCount, 1);
		float sampleWidth = 1.0 / float(matFrameCount);
		float sampleStart = sampleWidth * float(uMaterialFrame%matFrameCount);
		vec2 matCoord = sampledCoord.xy * 0.5 + 0.5;

		#ifdef CLONE_STAMP_DEST
			vec4 srcModelUVs;
			uint2 srcIds;
			if( !getSrcModelUVs( matCoord.xy, srcModelUVs, srcIds, saturate(total.r) ) )
			{
				OUT_COLOR0 = vec4(0,0,0,0);
				OUT_COLOR2 = uint2(0,0);
				return;
			}

			OUT_COLOR0 = srcModelUVs;
			OUT_COLOR2 = srcIds; 
		#else 
			matCoord.x = sampleStart + matCoord.x * sampleWidth;

			//discard here if no paint so that we don't potentially mess up the UVs 
			//(can happen if the UVs are reused in an area near but not actually in the splot)
	
			if(total.r == 0.0)
			{ discard; }

			vec3 result = saturate(vec3(matCoord.xy, op));

			// Note the particular format and the opacity in input...
			OUT_COLOR0.gba = result;
		#endif

	#endif //OUTPUT_UVS

	#ifndef CLONE_STAMP_DEST
		if(OUT_COLOR0.r > 0.0)
		{ imageStore(uSparseness, (uint2(IN_POSITION.xy) * SPARSE_BUFFER_SIZE) / (uint2(uTargetSize)), vec4((float)uSparseRefValue/255.0, 1.0, 1.0, 1.0)); }
	#endif
#else
	
	OUT_COLOR0 = makeOverlay(total.r, targetUV, fBrushCoord0.xy);
#endif //USE_OVERLAY
	
#ifdef OUTPUT_DIRECTION
	TangentBasis basis = createTangentBasis(normalize(fNormal), normalize(fTangent));
	vec3 tDir = vec3(0.0, 0.0, 0.0);
	for (int i = 0; i < SPLOT_COUNT; i++) 
	{
		if( length(uDir[i].xy) > 0.0 )
		{
			tDir += normalize(transformVecTo(basis, normalize(uDir[i].xyz)));
		}
	}
	OUT_COLOR0.gb = tDir.xy;
	OUT_COLOR0.gb *= saturate(total.r); // attenuates the direction by flow value
#endif
}
