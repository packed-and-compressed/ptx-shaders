#include "data/shader/mat/state.frag"

struct  AlbedoGradientMapParams
{
	uint		texture;
	uint        gradientTexture;
    packed_vec2 gradientTexelSize;
	packed_vec3	color;
};
void    AlbedoGradientMap( in AlbedoGradientMapParams p, inout MaterialState m, inout FragmentState s )
{
#ifdef REFLECTION_HAIR
	vec4 wu        = vec4( s.vertexTexCoordSecondary.x, m.vertexTexCoord.uvCoord.x, s.vertexTexCoordSecondary.zw );
    wu.xy          = clampUV( wu.xy, p.gradientTexelSize );
    m.albedo       = textureMaterial( p.texture, m.vertexTexCoord, vec4(1.0,1.0,1.0,1.0) ) * textureMaterial( p.gradientTexture, wu, vec4(1.0,1.0,1.0,1.0) );
#else
    m.albedo       = textureMaterial( p.texture, m.vertexTexCoord, vec4( 1.0, 1.0, 1.0, 1.0 ) ) * textureMaterial( p.gradientTexture, m.vertexTexCoord, vec4( 1.0, 1.0, 1.0, 1.0 ) );
#endif
    
    m.hairAlbedo   = m.albedo.rgb;
    m.hairTint     = p.color;
	
	m.albedo.rgb  *= p.color;
    m.scatterColor = m.albedo.rgb;
}

void	AlbedoGradientMapMerge( in MaterialState m, inout FragmentState s )
{
    s.albedo	 = m.albedo;
    s.hairAlbedo = m.hairAlbedo;
    s.hairTint   = m.hairTint;
}

float   AlbedoGradientMapOpacity( in AlbedoGradientMapParams p, SampleCoord tc, FragmentState s )
{
    return textureMaterial( p.texture, tc, vec4( 1.0, 1.0, 1.0, 1.0 ) ).a * textureMaterial( p.gradientTexture, tc, vec4( 1.0, 1.0, 1.0, 1.0 ) ).a;
}

#define AlbedoParams		    AlbedoGradientMapParams
#define Albedo(p,m,s)		    AlbedoGradientMap(p.albedo,m,s)
#define AlbedoMerge			    AlbedoGradientMapMerge
#define AlbedoMergeFunction	    AlbedoGradientMapMerge
#define AlbedoOpacity(p,tc,s)   AlbedoGradientMapOpacity(p.albedo,tc,s)