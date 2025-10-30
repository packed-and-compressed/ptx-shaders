//inherits "normalMap.frag"

#include "data/shader/common/const.sh"
#include "data/shader/common/packed.sh"
#include "data/shader/common/util.sh"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/common/rng.comp"
#include "data/shader/common/halton.comp"
#include "data/shader/mat/renderable.frag"
#include "data/shader/mat/mesh.comp"
#include "data/shader/scene/raytracing/bssrdf/cubic.comp"

#define BEVEL_FLAG_HARDEDGES    (1u<<16)
#define BEVEL_FLAG_SAMESURFACE  (1u<<17)

struct SurfaceBevelParams
{
    SurfaceNormalMapParams base;

    float   bevelWidth;
    float   bevelCosAngle;
    uint    bevelMaskSamplesFlags;
    uint    bevelSmoothAdjacencyBuffer;
};
void    SurfaceBevel( in SurfaceBevelParams p, in uvec3 texCoordTransform, inout MaterialState m, inout FragmentState s )
{
    SurfaceNormalMap( p.base, texCoordTransform, m, s );

#if defined(SurfaceBevelApply)
    const bool flagHardEdges   = p.bevelMaskSamplesFlags & BEVEL_FLAG_HARDEDGES;
    const bool flagSameSurface = p.bevelMaskSamplesFlags & BEVEL_FLAG_SAMESURFACE;

	float bevelWidth = p.bevelWidth;
	switch( p.bevelMaskSamplesFlags & 0x7 )
	{
	case 1: bevelWidth *= s.vertexColor.r; break;
	case 2: bevelWidth *= s.vertexColor.g; break;
	case 3: bevelWidth *= s.vertexColor.b; break;
	case 4: bevelWidth *= s.vertexColor.a; break;
	}
	
    if( !s.allowSurfaceBevel || bevelWidth == 0.0 )
    { return; }

    uint smoothAdjacencyBegin = ~uint(0);
    uint smoothAdjacencyEnd   = 0;
    if( flagHardEdges )
    {
        smoothAdjacencyBegin = meshBufferLoad( p.bevelSmoothAdjacencyBuffer, s.primitiveID );
        if( smoothAdjacencyBegin != ~uint(0) )
        {
            uint count = meshBufferLoad( p.bevelSmoothAdjacencyBuffer, smoothAdjacencyBegin );
            smoothAdjacencyBegin++;
            smoothAdjacencyEnd = smoothAdjacencyBegin + count;
        }
    }

    Traceable traceable = flagSameSurface
                        ? ObjectTraceable( s.objectID )
                        : SceneTraceable;
    
    TangentBasis basis = createTangentBasis( s.geometricNormal, s.vertexTangent );

    vec3 bevelNormal = vec3( 0.0, 0.0, 0.0 );

#ifdef MATERIAL_PASS_BAKE
    uint numSamples = 96;
    for( uint i=0; i<numSamples; ++i )
    {
        vec2 rand = halton23( numSamples*s.bakePass + i );
#else
    uint numSamples = ( p.bevelMaskSamplesFlags >> 3 ) & 0x7FF;
    for( uint i=0; i<numSamples; ++i )
    {
        vec2 rand = rngNextVec2( s.rng );
#endif

		//select probe ray orientation/tangent frame
        vec3 X, Y, Z;
        uint rayAxis;
        if( rand.x < 0.5 )
        {
            X = basis.T; Y = basis.B; Z = basis.N;
            rayAxis = 0; //N
            rand.x *= 2.0;
        }
        else if( rand.x < 0.75 )
        {
            X = basis.N; Y = basis.B; Z = basis.T;
            rayAxis = 1; //T
            rand.x = ( rand.x - 0.5 ) * 4.0;
        }
        else
        { 
            X = basis.T; Y = basis.N; Z = basis.B;
            rayAxis = 2; //B
            rand.x = ( rand.x - 0.75 ) * 4.0;
        }

		//select probe ray direction
		//shooting probe rays from both sides ensures that sampling doesn't favor one side of the neighboring geometry ~ms
		if( rand.y < 0.5 )
		{
			rand.y *= 2.0;
		}
		else
		{
			Z = -Z;
			rand.y = ( rand.y - 0.5 ) * 2.0;
		}

        float h;
        float r   = sampleCubicProfile( rand.x, bevelWidth, h );
        float phi = TWOPI * rand.y;
        vec3  P   = r * (X * cos(phi) + Y * sin(phi) ) + Z * h;

        Ray ray;
        ray.origin = s.vertexPosition + P;
        ray.direction = -Z;
        ray.minT = 0.0;
        ray.maxT = 2.0 * h;

        RayHit hit;
        if( traceRay( traceable, RT_RAYTYPE_ANY, ray, s.rng, hit ) )
        {
            Renderable renderable = bRenderables[hit.objectIndex];
            mat3x3 transformInverseTranspose = transpose3x3( unpack(renderable.transformInverse) );

            uint3 tri  = loadTriangle( renderable.mesh, hit.triangleIndex );
            vec3  P0   = meshLoadVertexPosition( renderable.mesh, tri.x );
            vec3  N0   = meshLoadVertexNormal( renderable.mesh, tri.x );
            vec3  P1   = meshLoadVertexPosition( renderable.mesh, tri.y );
            vec3  N1   = meshLoadVertexNormal( renderable.mesh, tri.y );
            vec3  P2   = meshLoadVertexPosition( renderable.mesh, tri.z );
            vec3  N2   = meshLoadVertexNormal( renderable.mesh, tri.z );

            vec3  Ng   = cross( P1 - P0, P2 - P0 );
                  Ng   = normalize( mulVec( transformInverseTranspose, Ng ) );
            vec3  Nobj = saturate( 1.0 - hit.triangleCoords.x - hit.triangleCoords.y ) * N0 + hit.triangleCoords.x * N1 + hit.triangleCoords.y * N2;
            vec3  Nhit = normalize( mulVec( transformInverseTranspose, Nobj ) );
            
            vec3  Phit = ray.origin + ray.direction * hit.distance;
            float rhit = length( Phit - s.vertexPosition );

            float pdfZ = abs( dot( Ng, Z ) ) * ( rayAxis == 0 ? 0.5 : 0.25 );
            float pdfX = abs( dot( Ng, X ) ) * ( rayAxis == 1 ? 0.5 : 0.25 );
            float pdfY = abs( dot( Ng, Y ) ) * ( rayAxis == 2 ? 0.5 : 0.25 );

            float weight  = pdfZ * rcp( pdfX*pdfX + pdfY*pdfY + pdfZ*pdfZ );
            float pdf     = pdfCubicProfile( rhit, bevelWidth );
            float pdfDisk = pdfCubicProfile( r, bevelWidth );
            weight       *= pdf * rcp( pdfDisk );

            //apply bevel based on minimum angle between vertex normal & sampled normal (unless we hit different object)
            bool applyBevel = s.objectID != hit.objectIndex || dot( s.vertexNormal, Nhit ) <= p.bevelCosAngle;
            if( !applyBevel && flagHardEdges )
            {
                //hard edges mode: apply bevel if hit triangle is NOT part of smooth adjacency list
                uint hitPrimitiveID = meshGetPrimitiveID( renderable.mesh, hit.triangleIndex );
                if( s.primitiveID != hitPrimitiveID ) //each triangle is implicitly part of its own smooth adjacency
                {
                    applyBevel = true;
                    for( uint i = smoothAdjacencyBegin; i < smoothAdjacencyEnd; ++i )
                    {
                        if( meshBufferLoad( p.bevelSmoothAdjacencyBuffer, i ) == hitPrimitiveID )
                        {
                            applyBevel = false;
                            break;
                        }
                    }
                }
            }
            
            //accumulate either sampled normal if applying bevel, or current vertex normal if not (so that original edge is preserved)
            bevelNormal += ( applyBevel ? Nhit : s.vertexNormal ) * weight;
        }
    }

    float bevelNormalLen2 = dot( bevelNormal, bevelNormal );
    if( bevelNormalLen2 > 0.0 )
    {
        //apply bevel on top of shading normal
        bevelNormal *= rsqrt( bevelNormalLen2 );
        vec3 bevelNormalOffset = bevelNormal - s.vertexNormal;
        m.normal = normalizeSafe( m.normal + bevelNormalOffset );
    }
#endif
}

#undef  SurfaceParams
#undef  Surface
#define SurfaceParams		SurfaceBevelParams
#define Surface(p,m,s)		SurfaceBevel(p.surface,p.texCoordTransform,m,s)
