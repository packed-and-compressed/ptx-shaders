#include "data/shader/common/util.sh"
#include "data/shader/common/unproject.sh"

uniform mat4 uProjection;

USE_TEXTURE2D_NOSAMPLER( tViewDepth );
#if defined( PrepassDepthDifferential )
    USE_LOADSTORE_TEXTURE2D( float, tMotionVector, 0 );
#endif

BEGIN_PARAMS
    INPUT0(vec2,fCoord)
    OUTPUT_DEPTH(float)
END_PARAMS
{
#ifdef RENDERTARGET_Y_DOWN
	vec2 screenCoord = vec2( 0.5, -0.5 ) * fCoord + vec2( 0.5, 0.5 );
#else
	vec2 screenCoord = vec2( 0.5, 0.5 ) * fCoord + vec2( 0.5, 0.5 );
#endif
    float viewDepth = imageLoad( tViewDepth, uint2(IN_POSITION.xy) ).r;
    vec3 viewPosition = unprojectViewDepthToViewPos( screenCoord, viewDepth );
    vec4 rasterPosition = mulPoint( uProjection, viewPosition );
    OUT_DEPTH = rasterPosition.z / rasterPosition.w;

#if defined( PrepassDepthDifferential )
    // In hybrid we store prepass depth differential along with motion vector
	const vec2 motionVector = imageLoadRW( tMotionVector, uint2( IN_POSITION.xy ) ).xy;
	const float normalizedDepth = abs( viewDepth );
	const float depthFWidth = abs( ddx( normalizedDepth ) ) + abs( ddy( normalizedDepth ) );
	imageStore( tMotionVector, uint2( IN_POSITION.xy ), vec4( motionVector, depthFWidth, 0.0f ) );
#endif
}
