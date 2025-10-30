#include "data/shader/common/sharedconstants.sh"
#include "data/shader/mat/state.frag"
#include "data/shader/mat/fresnel.frag"
#include "data/shader/scene/raytracing/buffers.comp"

uniform uint uBasePrimitiveID;

#define USE_OUTPUT1_UINT
#define USE_OUTPUT2
#define USE_OUTPUT3
#ifdef PrepassOutputShadowCatcher
	#define USE_OUTPUT4
#endif

void	PrepassMergeHybridGBuffer( inout FragmentState s )
{
	//view space depth
	s.output0.x = s.vertexPosition.z;

	//object ID
	s.output1.x = asfloat( s.objectID + 1 );

	//triangleID + barycentrics
	s.output2.x = asfloat( uBasePrimitiveID + s.primitiveID );
	s.output2.y = asfloat( packUnitVec2f( s.triangleBarycentrics.yz ) );

	// motion vector and fwidth of view space depth
	s.output3.xy = s.vertexMotionNDC;
	const float depth = abs( s.vertexPosition.z );
	s.output3.z = abs( ddx( depth ) ) + abs( ddy( depth ) );
	s.output3.w = length( ddx( s.normal ) ) + length( ddy( s.normal ) );
#ifdef PrepassOutputShadowCatcher
	#ifdef TransparencyMerge
		s.output4.x = s.albedo.a;
	#else
		s.output4.x = 1.0f;
	#endif
#endif
}

#define  Merge  PrepassMergeHybridGBuffer
