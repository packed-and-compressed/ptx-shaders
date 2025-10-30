#include "data/shader/mat/state.frag"
#include "data/shader/common/util.sh"

void	SurfaceNormalAdjustImpl( inout FragmentState s )
{
	vec3 N  = s.normal;
	vec3 Ng = s.geometricNormal;
	vec3 V  = s.vertexEye;

	HINT_FLATTEN
	if( s.normalAdjust < 1.0 )
	{
		//use vertex normal when doing partial adjustment
		Ng = normalize( s.vertexNormal );
	}

	float VdotN  = dot( V, N );
	float VdotNg = dot( V, Ng );

	//assume -V as reflection vector if shading normal is pointing away from view vector
	vec3  R = VdotN > 0.0 ? reflectVec( V, N ) : -V;
	float RdotNg = dot( R, Ng );
	
	//adjust shading normal if reflection vector is very shallow
	//(less than ~0.5 deg but can be as shallow as view vector)
	float t = min( VdotNg, 0.0087 );
	if( RdotNg < t )
	{
		//lift reflection vector at most ~0.5 deg above surface
		R += Ng * ( t - RdotNg );
		//compute new shading normal as bisector of view vector and lifted reflection vector
		N = normalize( V * length(R) + R );
		s.normal = s.normalAdjust < 1.0 ? normalize( mix( s.normal, N, s.normalAdjust ) ) : N;
	}
}

#define SurfaceNormalAdjust	SurfaceNormalAdjustImpl
