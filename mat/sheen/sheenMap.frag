#include "data/shader/mat/state.frag"
#include "data/shader/common/util.sh"

#define SHEEN_FLAG_USEMICROSURFACE	(1u<<27)

struct	SheenMapParams
{
	packed_vec4 color;
	uint		texture;
	uint		roughnessTexture;
	uint		roughnessScaleBias;
	uint		padding;
};
void	SheenMap( in SheenMapParams p, inout MaterialState m, in FragmentState s )
{
	//sheen color
	m.sheen  = textureMaterial( p.texture, m.vertexTexCoord, vec4(1.0, 1.0, 1.0, 0.0) ).xyz;
	m.sheen *= p.color.rgb;
    m.sheenTint = p.color.a;
    
	//sheen roughness
    m.sheenRoughnessFromGloss = ( p.roughnessTexture & SHEEN_FLAG_USEMICROSURFACE ) != 0;
    if( m.sheenRoughnessFromGloss )
	{
        m.sheenGlossOrRoughnes = saturate( 1.0 - m.glossOrRoughness );
        m.sheenRoughnessFromGloss = !m.glossFromRoughness;
    }
	else
	{
		float r = textureMaterial( p.roughnessTexture, m.vertexTexCoord, 1.0 );
        m.sheenGlossOrRoughnes = scaleAndBias( r, p.roughnessScaleBias );
    }
}

void SheenMapMerge( in MaterialState m, inout FragmentState s )
{
    //sheen color
    s.sheen = m.sheen;
    
    //sheen roughness
    if( m.sheenRoughnessFromGloss )
    {
        s.sheenRoughness = saturate( 1.0 - m.sheenGlossOrRoughnes );
    }
	else
    {
        s.sheenRoughness = m.sheenGlossOrRoughnes;
    }

#if !defined(MATERIAL_PASS_EXPORT) 
	//Disney BRDF style sheen tinting
    float lumAlbedo = luminance( s.albedo.rgb );
    vec3 sheenTint = lumAlbedo > 0.0 ? s.albedo.rgb * rcp( lumAlbedo ) : vec3( 1.0, 1.0, 1.0 );
    s.sheen *= mix( vec3( 1.0, 1.0, 1.0 ), saturate( sheenTint ), m.sheenTint );
#endif
}

#define SheenParams		SheenMapParams
#define Sheen(p,m,s)	SheenMap(p.sheen,m,s)
#define SheenMerge		SheenMapMerge
