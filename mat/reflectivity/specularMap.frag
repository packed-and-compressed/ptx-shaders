#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/remap.frag"

#ifndef SPECULAR_FLAG_RGB
#define SPECULAR_FLAG_RGB       (1u<<0)
#define SPECULAR_FLAG_CONSERVE  (1u<<1)
#endif

#if ( defined( MATERIAL_PASS_PAINT ) || defined( MATERIAL_PASS_COLOR_SAMPLE ) ) && !defined(SUBROUTINE_SECONDARY)
uniform float	uMetalCenter;
uniform float	uMetalRange;
#endif

struct  ReflectivitySpecularMapParams
{
	uint		texture;
	packed_vec3	color;
	uint		flags;
	packed_vec3	fresnel;
};
void    ReflectivitySpecularMap( in ReflectivitySpecularMapParams p, inout MaterialState m, in FragmentState s )
{
	if( p.flags & SPECULAR_FLAG_RGB )
	{
		_p(m.specular) = textureMaterial( p.texture, m.vertexTexCoord, vec4(1.0,1.0,1.0,0.0) ).rgb;
	}
	else
	{
		float specular = textureMaterial( p.texture, m.vertexTexCoord, 1.0 );
		_p(m.specular) = vec3(specular, specular, specular);
	}

	_p(m.specular)        *= p.color;
	_p(m.specularConserve) = p.flags & SPECULAR_FLAG_CONSERVE;
	_p(m.fresnel)          = p.fresnel;
}

void	ReflectivitySpecularMapMerge( in MaterialState m, inout FragmentState s )
{
	float F0 = maxcomp( _p(m.specular) );
	_p(s.reflectivity) = _p(m.specular);
	_p(s.fresnel) = _p(m.fresnel);
	_p(s.eta) = remapReflectivityToEta( F0 );

	#if ( defined(MATERIAL_PASS_PAINT) || defined( MATERIAL_PASS_COLOR_SAMPLE ) ) && !defined(SUBROUTINE_SECONDARY)
		vec3 metalSpec = saturate( ( saturate( s.reflectivity.xyz - vec3( 0.04, 0.04, 0.04 ) ) / saturate( s.albedo.xyz + vec3(.04, .04, .04) ) ) / .96 );
		float metal = max( metalSpec.r, max( metalSpec.g, metalSpec.b ) );
		float metalMin = saturate( uMetalCenter - uMetalRange );
		float metalMax = saturate( uMetalCenter );
		metal = clamp( ( metal - metalMin ) / ( metalMax - metalMin ), 0.0, 1.0 );
		s.metalness = metal;
		// specular color ends up in metalness base color for dielectrics
		s.baseColor = mix( s.albedo.rgb, _p(s.reflectivity.rgb), s.metalness ); 
	#endif

#if !defined(MATERIAL_PASS_PAINT) && !defined(MATERIAL_PASS_COLOR_SAMPLE)
	if( _p(m.specularConserve) )
	{
	#ifdef SUBROUTINE_SECONDARY
		s.metalness = max( s.metalness, remapReflectivityToMetalness( F0 ) );
	#else
		s.metalness = remapReflectivityToMetalness( F0 );
	#endif
	}
#endif
#if defined(MATERIAL_PASS_COMPONENTVIEW) || defined(MATERIAL_PASS_BAKE)
	#ifndef SUBROUTINE_SECONDARY
		s.metalness = remapReflectivityToMetalness( F0 );
	#endif
#endif
}

#ifdef SUBROUTINE_SECONDARY
	#define	ReflectivityParamsSecondary			ReflectivitySpecularMapParamsSecondary
	#define	ReflectivitySecondary(p,m,s)		ReflectivitySpecularMapSecondary(p.reflectivitySecondary,m,s)
	#define	ReflectivityMergeSecondary			ReflectivitySpecularMapMergeSecondary
	#define ReflectivityMergeFunctionSecondary	ReflectivitySpecularMapMerge
#else
	#define	ReflectivityParams					ReflectivitySpecularMapParams
	#define	Reflectivity(p,m,s)					ReflectivitySpecularMap(p.reflectivity,m,s)
	#define	ReflectivityMerge					ReflectivitySpecularMapMerge
	#define ReflectivityMergeFunction			ReflectivitySpecularMapMerge
#endif
