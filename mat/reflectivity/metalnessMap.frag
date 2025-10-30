#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/remap.frag"

#ifdef  METALNESS_ADVANCED
#define METALNESS_FLAG_SPECCONSERVE		(1u<<27)
#define METALNESS_FLAG_SPECCURVEADJUST	(1u<<28)
#endif

struct	ReflectivityMetalnessParams
{
	uint	metalnessScaleBias;
	uint	metalnessTexture;
#ifdef METALNESS_ADVANCED
	uint	specularScaleBias;
	uint 	specularTexture;
#endif
};
void    ReflectivityMetalness( in ReflectivityMetalnessParams p, inout MaterialState m, in FragmentState s )
{
	float metalness = textureMaterial( p.metalnessTexture, m.vertexTexCoord, 1.0 );
	m.metalness = scaleAndBias( metalness, p.metalnessScaleBias );
	_p(m.specular) = vec3( 0.04, 0.04, 0.04 );

	#ifdef METALNESS_ADVANCED
	{
		float specular = textureMaterial( p.specularTexture, m.vertexTexCoord, 1.0 );
		specular = scaleAndBias( specular, p.specularScaleBias );
		if( p.specularTexture & METALNESS_FLAG_SPECCURVEADJUST ) { specular *= specular; }

		_p(m.specular) = vec3( specular, specular, specular );
		_p(m.specularConserve) = p.specularTexture & METALNESS_FLAG_SPECCONSERVE;
	}
#endif
}

void	ReflectivityMetalnessMerge( in MaterialState m, inout FragmentState s )
{
	s.metalness = m.metalness;
	
	float F0 = _p(m.specular).r;
	_p(s.reflectivity) = mix( vec3(F0, F0, F0), s.albedo.rgb, s.metalness );
	_p(s.eta) = remapReflectivityToEta( F0 );

	#ifdef METALNESS_ADVANCED
	{
		if( _p(m.specularConserve) )
		{ s.metalness = max( s.metalness, remapReflectivityToMetalness(F0) ); }
	}
	#endif
}

#ifdef SUBROUTINE_SECONDARY
	#define ReflectivityParamsSecondary			ReflectivityMetalnessParamsSecondary
	#define	ReflectivitySecondary(p,m,s)		ReflectivityMetalnessSecondary(p.reflectivitySecondary,m,s)
	#define ReflectivityMergeSecondary			ReflectivityMetalnessMergeSecondary
	#define	ReflectivityMergeFunctionSecondary	ReflectivityMetalnessMergeSecondary
#else
	#define ReflectivityParams					ReflectivityMetalnessParams
	#define	Reflectivity(p,m,s)					ReflectivityMetalness(p.reflectivity,m,s)
	#define ReflectivityMerge					ReflectivityMetalnessMerge
	#define ReflectivityMergeFunction			ReflectivityMetalnessMerge
#endif
