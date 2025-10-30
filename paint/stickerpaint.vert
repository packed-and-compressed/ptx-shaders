#include "../common/util.sh"
#include "CommonPaint.sh"
#include "clonestamputils.sh"

uniform mat4	uModelMatrix;
uniform mat4	uModelBrush;
uniform mat4	uNormalMatrix;
uniform float 	uBrushAspect;

uniform float	uFlip;
uniform vec2	uUVShift;		//for drawing UVs that reside outside of the 0-1 range
uniform float	uAspect;			//aspect of the texture we're painting to
uniform float	uOutput3D;
uniform mat4	uViewProjectionMatrix;
uniform float	uFake2D;	//used for UV painting preview in 3D space

#if defined( CLONE_STAMP ) || defined( CLONE_STAMP_DEST )
uniform vec2	uMeshTexCoord0Offsets;
uniform vec4	uUVOffsetSrc;
uniform float	uCloneUVUnScale;
uniform uint	uActiveUVIslandId;
#endif

BEGIN_PARAMS
	INPUT0(vec3,	vPosition)	
	INPUT1(vec3,	vModelNorm)
	INPUT2(vec3, 	vModelTangent)
	INPUT3(vec2,	vUV)
	#if defined( CLONE_STAMP ) || defined( CLONE_STAMP_DEST )
		INPUT4(vec4, 	vCloneData)
		INPUT5(vec2,	vModelUV)
	#else
		INPUT4(vec2,	vModelUV)
	#endif

	#if defined(CLONE_COMPOSITE) || defined(CLONE_PRECOMPOSITE)
		OUTPUT0(vec2, fCoord)
	#else
		OUTPUT0(vec3, fNormal)
		OUTPUT1(vec3, fTangent)
		OUTPUT2(vec3, fPosition)
		OUTPUT3(vec4, fBrushCoord0)
		#ifdef CLONE_STAMP
			OUTPUT4(vec4, fCloneData)
		#endif
	#endif

END_PARAMS
{
	vec2 uvs = vUV;

	vec2 modelUV = vModelUV.xy;

	#if defined( CLONE_STAMP ) || defined( CLONE_STAMP_DEST )
		modelUV = decodeUVs( modelUV, uMeshTexCoord0Offsets );
	#endif
	
	#ifdef CLONE_STAMP
    { 
		fBrushCoord0 = vec4(modelUV, 0.f, 0.f); 
		
		fNormal = mulVec(uNormalMatrix, vModelNorm.xyz).xyz;
	    fTangent = mulVec(uModelMatrix, vModelTangent.xyz).xyz;

		vec3 modelUVUp = vCloneData.xyz;
		vec3 worldUVUp = mulVec(uModelMatrix, modelUVUp).xyz;

		fCloneData = vec4(worldUVUp, vCloneData.w);

		vec2 UVOffsetSrc = uUVOffsetSrc.xy;
		float cloneUVUnScale = uCloneUVUnScale;
		#ifdef CLONE_STAMP_DEBUG
			if( uExpandSrcBrushStickers > 0 )
			{ 
				UVOffsetSrc = vec2(0.f, 0.f);
				cloneUVUnScale = 1.f;
			}
		#endif

		vec4 pos = vec4(uvs.xy - UVOffsetSrc, 0.0, 1.0);
		fPosition = pos.xyz;
		pos.xy /= cloneUVUnScale; // [-0.5*uvScale, 0.5*uvScale] -> [-1, 1]
		OUT_POSITION = pos;
    }
	#else
	{
		#if defined(CLONE_COMPOSITE) || defined(CLONE_PRECOMPOSITE)
            fCoord = modelUV;
		#else
			#ifndef CLONE_STAMP_DEST
				uvs.xy = uvs.xy * 2.0 - 1.0;
                fBrushCoord0 = mulPoint(uModelBrush, vec3(uvs.xy, 0.0));
			#else
                fBrushCoord0.xyz = vec3(uvs.xy, 0.0);
			#endif
		
            fBrushCoord0.z = 0.5;
            fBrushCoord0.w = 1.0;

			vec4 pos = mulPoint( uViewProjectionMatrix, vPosition.xyz );
			fNormal = mulVec(uNormalMatrix, vModelNorm.xyz).xyz;
			fTangent = mulVec(uModelMatrix, vModelTangent.xyz).xyz;
			fPosition = vPosition.xyz;	//this is already transformed
			#if(TEST_NORMAL==FACE)	//with face normals, send the vertex position through the tangent pipe
				fTangent = mulPoint(uModelMatrix, vPosition.xyz).xyz; 
			#endif
		#endif

		#ifndef CLONE_STAMP_DEST
			//output can be in 3D space for viewport preview, or 2D texturespace space for UV preview or actual painting
			vec4 texSpace = vec4(2.0*(modelUV - uUVShift) - vec2(1.0,1.0), 0.0, 1.0);
			texSpace.xyz = mulPoint(uViewProjectionMatrix, texSpace.xyz).xyz;
			texSpace.y *= uFlip;
			texSpace.z = 0.0;

			OUT_POSITION = mix(texSpace, pos, float(uOutput3D));
		#else

			vec4 modelUVRange = uModelUVRange;
			#ifdef CLONE_COMPOSITE
				modelUVRange = uModelUVRangeNoComp;
			#endif

			vec4 texSpace = computeUnitModelUVs( modelUV, modelUVRange );
			texSpace.y = 1.f - texSpace.y;

			// [-1, 1]
			texSpace.xy = texSpace.xy * 2.0 - 1.0;

			OUT_POSITION = texSpace;

			//discard the tri if not inside the currently processed UVIsland
			uint uvISlandId = floor(vCloneData.w);
			if( uvISlandId != uActiveUVIslandId )
			{ OUT_POSITION.z = 99.0; }
		#endif
	}
	#endif
}
