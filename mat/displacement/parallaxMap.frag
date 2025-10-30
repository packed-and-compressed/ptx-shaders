#include "data/shader/common/packed.sh"
#include "data/shader/common/projector.sh"

#include "paramsParallaxMap.frag"

float	ParallaxSample( uint texture, vec2 brightnessContrastScaleBias, vec2 c )
{
	float value = ParallaxTextureSampleLod( texture, c, 0.0, 1.0 );
	value = brightnessContrastScaleBias.x * value + brightnessContrastScaleBias.y;
	return 1.0 - value;
}

float	ParallaxSample( uint texture, vec2 brightnessContrastScaleBias, TriplanarProjector proj, vec2 cX, vec2 cY, vec2 cZ )
{
	float tapX = ParallaxTextureSampleLod( texture, cX, 0.0, 1.0 );
	float tapY = ParallaxTextureSampleLod( texture, cY, 0.0, 1.0 );
	float tapZ = ParallaxTextureSampleLod( texture, cZ, 0.0, 1.0 );
	
	tapX = brightnessContrastScaleBias.x * tapX + brightnessContrastScaleBias.y;
	tapY = brightnessContrastScaleBias.x * tapY + brightnessContrastScaleBias.y;
	tapZ = brightnessContrastScaleBias.x * tapZ + brightnessContrastScaleBias.y;
	
	return 1.0 - triplanarMix( proj, tapX, tapY, tapZ );
}

void	DisplacementParallaxMap( in DisplacementParallaxMapParams p, in uvec3 texCoordTransform, inout MaterialState m, inout FragmentState s )
{
	vec2 depthOffset = vec2( f16tof32(p.depthOffset), f16tof32(p.depthOffset>>16) );

	vec3 dir =	vec3(	dot( -s.vertexEye, s.vertexTangent ),
						dot( -s.vertexEye, s.vertexBitangent ),
						dot( -s.vertexEye, s.vertexNormal )	);
	vec2 maxOffset = dir.xy * (depthOffset.x / (abs(dir.z) + 0.001));

	vec2 uvRotation = unpackVec2f( texCoordTransform.z );
	maxOffset = vec2( maxOffset.x * uvRotation.x - maxOffset.y * uvRotation.y,
						maxOffset.x * uvRotation.y + maxOffset.y * uvRotation.x );
	
	float minSamples = 16.0;
	float maxSamples = float( 1u << ( p.quality + 6u ) );
	float samples = saturate( 3.0*length(maxOffset) );
	float incr = rcp( mix( minSamples, maxSamples, samples ) );

	float h0;
	#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
		vec2 tc0X = m.vertexTexCoord.projectorCoord.uvX.xy - depthOffset.y*maxOffset;
		vec2 tc0Y = m.vertexTexCoord.projectorCoord.uvY.xy - depthOffset.y*maxOffset;
		vec2 tc0Z = m.vertexTexCoord.projectorCoord.uvZ.xy - depthOffset.y*maxOffset;
		h0 = ParallaxSample( p.heightTexture, p.brightnessContrastScaleBias, m.vertexTexCoord.projectorCoord, tc0X, tc0Y, tc0Z );
		HINT_LOOP
		for( float i=incr; i<=1.0; i+=incr )
		{
			vec2 tcX = tc0X + maxOffset * i;
			vec2 tcY = tc0Y + maxOffset * i;
			vec2 tcZ = tc0Z + maxOffset * i;
			float h1 = ParallaxSample( p.heightTexture, p.brightnessContrastScaleBias, m.vertexTexCoord.projectorCoord, tcX, tcY, tcZ );
			if( i >= h1 )
			{
				//hit! now interpolate
				float r1 = i, r0 = i-incr;
				float t = (h0-r0)/((h0-r0)+(-h1+r1));
				float r = (r0-t*r0) + t*r1;
				m.vertexTexCoord.projectorCoord.uvX.xy = tc0X + r*maxOffset;
				m.vertexTexCoord.projectorCoord.uvY.xy = tc0Y + r*maxOffset;
				m.vertexTexCoord.projectorCoord.uvZ.xy = tc0Z + r*maxOffset;
				break;
			}
			else
			{
				m.vertexTexCoord.projectorCoord.uvX.xy = tc0X + maxOffset;
				m.vertexTexCoord.projectorCoord.uvY.xy = tc0Y + maxOffset;
				m.vertexTexCoord.projectorCoord.uvZ.xy = tc0Z + maxOffset;
			}
			h0 = h1;
		}
	#endif // MATERIAL_TEXTURE_MODE_TRIPLANAR
	
	vec2 tc0 = m.vertexTexCoord.uvCoord.xy - depthOffset.y * maxOffset;
	h0 = ParallaxSample( p.heightTexture, p.brightnessContrastScaleBias, tc0 );
	HINT_LOOP
	for( float i=incr; i<=1.0; i+=incr )
	{
		vec2 tc = tc0 + maxOffset * i;
		float h1 = ParallaxSample( p.heightTexture, p.brightnessContrastScaleBias, tc );
		if( i >= h1 )
		{
			//hit! now interpolate
			float r1 = i, r0 = i-incr;
			float t = (h0-r0)/((h0-r0)+(-h1+r1));
			float r = (r0-t*r0) + t*r1;
			m.vertexTexCoord.uvCoord.xy = tc0 + r * maxOffset;
			break;
		}
		else
		{
			m.vertexTexCoord.uvCoord.xy = tc0 + maxOffset;
		}
		h0 = h1;
	}
}

void DisplacemenParallaxMapMerge( in MaterialState m, inout FragmentState s )
{
	// NOOP
}

#define Displacement(p,m,s)			DisplacementParallaxMap(p.displacement,p.texCoordTransform,m,s)
#define DisplacementMerge			DisplacemenParallaxMapMerge
#define DisplacementApply(s)
