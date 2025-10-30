#include "data/shader/common/util.sh"
#include "data/shader/common/floatmap.sh"

struct AxisBounds
{
    packed_uvec3 bmin;
    packed_uvec3 bmax;
};
USE_STRUCTUREDBUFFER(AxisBounds,bLocalBounds);

uniform mat4    uModelViewProjection;

BEGIN_PARAMS
    INPUT_VERTEXID(vID)
END_PARAMS
{
    AxisBounds bounds = bLocalBounds[0];
    vec3 bmin = vec3(
        inverseOrderPreservingFloatMap( bounds.bmin.x ),
        inverseOrderPreservingFloatMap( bounds.bmin.y ),
        inverseOrderPreservingFloatMap( bounds.bmin.z )
    );
    vec3 bmax = vec3(    
        inverseOrderPreservingFloatMap( bounds.bmax.x ),
        inverseOrderPreservingFloatMap( bounds.bmax.y ),
        inverseOrderPreservingFloatMap( bounds.bmax.z )
    );

    vec3 center = 0.5 * ( bmin + bmax );
    vec3 scale  = bmax - bmin;

    uint3 cube = uint3( vID & 0x1, (vID & 0x2) >> 1, (vID & 0x4) >> 2 );
    vec3 position = ( vec3(cube) - 0.5 ) * scale + center;
    OUT_POSITION = mulPoint( uModelViewProjection, position );
}
