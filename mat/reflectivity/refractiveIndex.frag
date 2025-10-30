#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/remap.frag"

struct  ReflectivityRefractiveIndexParams
{
	float index;
	uint  indexTexture;
	uint  metalnessTexture;
	uint  metalnessScaleBias;
};
void    ReflectivityRefractiveIndex( in ReflectivityRefractiveIndexParams p, inout MaterialState m, in FragmentState s )
{
	float index = p.index * textureMaterial( p.indexTexture, m.vertexTexCoord, 1.0 );
	float F0    = remapIORToReflectivity( index );
	_p(m.specular) = vec3( F0, F0, F0 );

#ifndef SUBROUTINE_SECONDARY
	float metalness = textureMaterial( p.metalnessTexture, m.vertexTexCoord, 1.0 );
	m.metalness = scaleAndBias( metalness, p.metalnessScaleBias );
#endif
}

void	ReflectivityRefractiveIndexMerge( in MaterialState m, inout FragmentState s )
{
	float F0 = _p(m.specular).r;
	_p(s.eta) = remapReflectivityToEta( F0 );
#ifdef SUBROUTINE_SECONDARY
	_p(s.reflectivity) = vec3( F0, F0, F0 );
#else
	s.metalness = m.metalness;
	_p(s.reflectivity) = mix( vec3( F0, F0, F0 ), s.albedo.rgb, s.metalness );
#endif
	//energy conservation
	s.metalness = max( s.metalness, remapReflectivityToMetalness( F0 ) );
}

#ifdef SUBROUTINE_SECONDARY
	#define	ReflectivityParamsSecondary			ReflectivityRefractiveIndexParamsSecondary
	#define	ReflectivitySecondary(p,m,s)		ReflectivityRefractiveIndexSecondary(p.reflectivitySecondary,m,s)
	#define	ReflectivityMergeSecondary			ReflectivityRefractiveIndexMergeSecondary
	#define ReflectivityMergeFunctionSecondary	ReflectivityRefractiveIndexMergeSecondary
#else
	#define ReflectivityParams					ReflectivityRefractiveIndexParams
	#define	Reflectivity(p,m,s)					ReflectivityRefractiveIndex(p.reflectivity,m,s)
	#define ReflectivityMerge					ReflectivityRefractiveIndexMerge
	#define ReflectivityMergeFunction			ReflectivityRefractiveIndexMerge
#endif
