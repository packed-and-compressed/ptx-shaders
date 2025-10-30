#include "hit.frag"
#include "intersectionData.frag"
#include "hemisphereSample.frag"

uniform float uBevelOffsetScale;
USE_TEXTURE2D( tMatNormals );
USE_STRUCTUREDBUFFER(SrcMatInfo,bSrcMatInfo);

void	Process( inout BakeHit h )
{
	vec3 shadingNormal = h.hitNormal;
	float offset = uHemisphereOffsetEstimate;

	//load material normal
	vec4 b = imageLoad( tMatNormals, h.dstPixelCoord );
	if( b.a > 0 )
	{
		shadingNormal = b.xyz / b.a;
		shadingNormal = normalize( 2.0 * shadingNormal - vec3(1,1,1) );
	}
	float bevelRadius = bSrcMatInfo[h.hitMaterialID].bevelRadius;

	//offset the bake hemisphere in proportion to the angle between the
	//beveled normal and the hit normal.
	float cosTheta = dot( shadingNormal, h.hitNormal );
	float sinTheta = sqrt( saturate( 1.0 - cosTheta*cosTheta ) );
	sinTheta = saturate( sinTheta - .002 ); //minor correction to ignore small deviations; often bevelRadius >> hemisphereOffset
	offset = max( offset, uBevelOffsetScale * bevelRadius * sinTheta );

	//sample AO rays
	float ao = hemisphereSample( h.hitPosition, shadingNormal, offset, ushort2(h.dstPixelCoord.xy), 0 ).ao;
	h.output0 = vec4( ao, ao, ao, 1.0 );
}

float	Pack( vec4 v )
{
	//stores alpha/hit signal in low bit
	uint occlusion = asuint( v.x );
	uint alpha = v.w > 0.0 ? 1 : 0;
	return asfloat( (occlusion & ~uint(1)) | alpha );
}
