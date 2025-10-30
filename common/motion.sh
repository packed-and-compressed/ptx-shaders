#ifndef MSET_MOTION_SH
#define MSET_MOTION_SH

uniform mat4	uMotionObjectToShading;
uniform mat4	uMotionObjectToShadingPrev;

uniform mat4	uMotionObjectToRaster;
uniform mat4	uMotionObjectToRasterPrev;
uniform vec4	uMotionJitter; //{current, prev}

vec3	computeVelocity( vec3 position )
{
	vec3 shadingPosition = mulPoint( uMotionObjectToShading, position ).xyz;
	vec3 shadingPositionPrev = mulPoint( uMotionObjectToShadingPrev, position ).xyz;
	return shadingPosition - shadingPositionPrev;
}

vec2	computeMotionNDC( vec3 position )
{
	vec4 rasterPosition = mulPoint( uMotionObjectToRaster, position );
	vec2 ndcPosition = ( rasterPosition.xy / rasterPosition.w ) - uMotionJitter.xy;
	ndcPosition = ndcPosition * vec2( 0.5, -0.5 ) + vec2( 0.5, 0.5 );
	
	vec4 rasterPositionPrev = mulPoint( uMotionObjectToRasterPrev, position );
	vec2 ndcPositionPrev = ( rasterPositionPrev.xy / rasterPositionPrev.w ) - uMotionJitter.zw;
	ndcPositionPrev = ndcPositionPrev * vec2( 0.5, -0.5 ) + vec2( 0.5, 0.5 );

	return ndcPosition - ndcPositionPrev;
}

#endif