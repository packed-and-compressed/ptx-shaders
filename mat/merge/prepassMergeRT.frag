#include "data/shader/mat/state.frag"
#include "data/shader/scene/raytracing/buffers.comp"

uniform uint uBasePrimitiveID;

#if defined(PrepassGBuffer)
	#define USE_OUTPUT1_UINT
	#define USE_OUTPUT2
#endif

#if defined(PrepassMotionVectors)
	#if defined(PrepassGBuffer)
		#define USE_OUTPUT3
	#else
		#define USE_OUTPUT1
	#endif
#endif

void	PrepassMergeRT( inout FragmentState s )
{
	//view space depth
	s.output0.x = s.vertexPosition.z;

#if defined(PrepassGBuffer)
	//object ID
	s.output1.x = asfloat( s.objectID+1 );

	//triangleID + barycentrics
	s.output2.x = asfloat( uBasePrimitiveID + s.primitiveID );
	s.output2.y = asfloat( packUnitVec2f( s.triangleBarycentrics.yz ) );
#endif

#if defined(PrepassMotionVectors)
	//motion vectors
	#if defined(PrepassGBuffer)
		s.output3.xy = s.vertexMotionNDC;
	#else
		s.output1.xy = s.vertexMotionNDC;
	#endif
#endif
}

#define  Merge  PrepassMergeRT
