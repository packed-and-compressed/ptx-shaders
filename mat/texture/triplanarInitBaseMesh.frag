#include "../mesh.comp"
#include "../renderable.frag"

void TextureTriplanarInitializeWithBaseMesh( Renderable renderable, inout FragmentState s )
{
    s.triplanarPosition = s.vertexPosition;
    s.triplanarNormal = s.vertexNormal;

    if( renderable.meshBase != 0 )
    {
        renderable.mesh.baseBufferIndex = renderable.meshBase;
        
        uint3 tri     = loadTriangle( renderable.mesh, s.primitiveID );

        vec3 position0 = meshLoadVertexPosition( renderable.mesh, tri.x );
        vec3 position1 = meshLoadVertexPosition( renderable.mesh, tri.y );
        vec3 position2 = meshLoadVertexPosition( renderable.mesh, tri.z );
        s.triplanarPosition = interpolateVertexAttribute( s.triangleBarycentrics, position0, position1, position2 );
        s.triplanarPosition = mulPoint( s.transform, s.triplanarPosition );

        vec3 normal0 = meshLoadVertexNormal( renderable.mesh, tri.x );
        vec3 normal1 = meshLoadVertexNormal( renderable.mesh, tri.y );
        vec3 normal2 = meshLoadVertexNormal( renderable.mesh, tri.z );
        s.triplanarNormal = interpolateVertexAttribute( s.triangleBarycentrics, normal0, normal1, normal2 );
        
        vec3 triangleNormal = cross( position1 - position0, position2 - position0 );

   	    //make sure triangle normal and interpolated normal have consistent orientation
	    HINT_FLATTEN
	    if( dot( triangleNormal, s.triplanarNormal ) < 0.0 )
	    { s.triplanarNormal = -s.triplanarNormal; }

        s.triplanarNormal = normalize( mulVec( s.transformInverseTranspose, s.triplanarNormal ) );
        
        #if defined(MATERIAL_PASS_LIGHT) ||\
            defined(MATERIAL_PASS_SCATTER) ||\
            defined(MATERIAL_PASS_COMPONENTVIEW) ||\
            defined(MATERIAL_PASS_PREPASS) ||\
            defined(MATERIAL_PASS_PREPASS_RT) ||\
            defined(MATERIAL_PASS_PREPASS_RTAO) ||\
            defined(MATERIAL_PASS_PREPASS_HYBRID) ||\
            defined(MATERIAL_PASS_SHADOWMAP) ||\
            defined(MATERIAL_PASS_COLOR_SAMPLE)
            // For these passes there is an additional transform that needs to be applied
            s.triplanarPosition = mulPoint( submatrix3x4( uMaterialTriplanarWorldToShadingTransform ), s.triplanarPosition );
            s.triplanarNormal = mulVec( submatrix3x3( uMaterialTriplanarWorldToShadingRotation ), s.triplanarNormal );
        #endif
    }
}
#define TextureInitialize   TextureTriplanarInitializeWithBaseMesh
