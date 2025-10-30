#include "data/shader/mat/state.frag"

struct  DisplacementHeightParams
{
	uint		texture;
    packed_vec2 brightnessContrastScaleBias;
    packed_vec2 meshScaleBias;
};
void	DisplacementHeight( in DisplacementHeightParams p, inout MaterialState m, in FragmentState s )
{
	//NOTE: It is possible for parallax to come in and override this displacement value with its heightmap later on.
	// Addition will not work if the default displacement value is 0.5 --Andres
	float disp = textureMaterial( p.texture, m.vertexTexCoord, 0.0 );
    disp = p.brightnessContrastScaleBias.x * disp + p.brightnessContrastScaleBias.y;
	m.displacement = vec3( disp, disp, disp );
    m.displacementMeshScaleBias = p.meshScaleBias;
}

void	DisplacementHeightMerge( in MaterialState m, inout FragmentState s )
{
    s.displacement = m.displacementMeshScaleBias.x * m.displacement + m.displacementMeshScaleBias.y;
}

void	DisplacementHeightApply( inout FragmentState s )
{
#if !defined(MATERIAL_PASS_PAINT) && !defined(MATERIAL_PASS_COLOR_SAMPLE)
	s.vertexPosition = s.vertexNormal * s.displacement + s.vertexPosition;
#endif
}

#define DisplacementParams		DisplacementHeightParams
#define	Displacement(p,m,s)		DisplacementHeight(p.displacement,m,s)
#define	DisplacementMerge		DisplacementHeightMerge
#define	DisplacementApply		DisplacementHeightApply
