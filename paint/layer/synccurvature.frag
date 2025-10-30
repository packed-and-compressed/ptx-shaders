#include "../../common/const.sh"

#include "data/shader/common/udim.sh"
#include "data/shader/common/globalTextures.sh"

#define BINDLESS
#ifdef SEAMLESS
	#include "skirtPadding.sh"
#endif

USE_SAMPLER( sNormalSampler );
uniform uint	uNormalMaps[UDIM_MAX_TILES_IN_SHAPE];
uniform uint2	uProjectShape;

uniform uint	uSampleCount;
uniform float	uSampleCountFractional;
uniform vec2	uKernel[8];
uniform vec2	uUDIMTile;

void	resolveUDIMValues( vec2 texCoord, uint2 shape, out uint mapIndex )
{
	uint arrayOffset;
	if( calculateUDIMArrayOffset( texCoord.xy, shape.x, shape.y, arrayOffset ) )
	{ mapIndex = uNormalMaps[arrayOffset]; }
	else
	{ mapIndex = 0; }
}

vec3	sampleNormals( vec2 coord, out bool valid )
{
	uint mapIndex;
	resolveUDIMValues( coord, uProjectShape, mapIndex );

	vec3 n = vec3( 0.0f, 0.0f, 1.0f );
	valid = false;
	if( mapIndex )
	{
		vec2 s =  textureWithSamplerLod( resourceByIndex( tGlobalTextures, mapIndex ), sNormalSampler, coord, 0.0 ).xy;
		valid = (s.x + s.y > 0.0);

		n.xy = 2.0 * s - vec2( 1.0, 1.0 );
		n.z = sqrt( saturate( 1.0 - dot(n.xy,n.xy) ) );
	}
	return n;
}

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	#ifdef SEAMLESS
		// early return to skip out of island pixels
		uint bufferAddress;
		int pixelMapIndex = getRasterPixelMapIndex( fBufferCoord + uUDIMTile, bufferAddress );
		if( pixelMapIndex == 0 )
		{
			OUT_COLOR0 = vec4( 0.5, 0.0, 0.0, 0.0 );
			return;
		}
	#endif

	vec3 centerNorm;
	bool validNormals;
	vec2 centerCoord = fBufferCoord + uUDIMTile;
	{
		#ifdef SEAMLESS
			if( pixelMapIndex < 0 )
			{
				RasterSkirtPixelDesc skirt = getRasterSkirtPixelDesc( pixelMapIndex, bufferAddress );
				centerCoord = skirt.remoteUV;
			}
		#endif

		centerNorm = sampleNormals( centerCoord, validNormals );
		if( !validNormals )
		{
			centerNorm = vec3( 0.0, 0.0, 1.0 );
		}
		centerNorm = normalize( centerNorm );
	}

	float curvature = 0.0;
	float samplesPassed = 0.0;
	for( uint i=0; i<8; ++i )
	{
		vec2 sampleStep = uKernel[i];
		vec2 sampleStepUnit = normalize(sampleStep);
		vec2 coord = centerCoord;
		vec3 baseNorm = centerNorm;

		for( uint s=0; s<uSampleCount; ++s )
		{
			coord += sampleStep;

			bool valid;
			vec3 n = sampleNormals( coord, valid );
			#ifdef SEAMLESS
				if( !valid )
				{
					uint bufferAddress;
					int ix = getRasterPixelMapIndex( coord, bufferAddress );
					if( ix < 0 )
					{
						RasterSkirtPixelDesc skirt = getRasterSkirtPixelDesc( ix, bufferAddress );
						coord = skirt.remoteUV;
						n = sampleNormals( coord, valid );

						float sinTheta, cosTheta;
						sincos( -skirt.tangentRotation, sinTheta, cosTheta );
			
						sampleStep = sampleStep.x * vec2(cosTheta,sinTheta) +
									 sampleStep.y * vec2(-sinTheta,cosTheta);
						sampleStepUnit = sampleStepUnit.x * vec2(cosTheta,sinTheta) +
										 sampleStepUnit.y * vec2(-sinTheta,cosTheta);

						#ifdef TANGENT_REORIENTATION
							if( valid )
							{
								mat3 reorient = getRasterSkirtReorientation( ix, bufferAddress );
								baseNorm = mul( reorient, baseNorm );
							}
						#else
							baseNorm.xy =	baseNorm.x * vec2(cosTheta,sinTheta) +
											baseNorm.y * vec2(-sinTheta,cosTheta);
						#endif
					}
				}
			#endif

			if( valid )
			{
				float w = saturate( uSampleCountFractional - float(s) );
				curvature += w * dot( n.xy-baseNorm.xy, sampleStepUnit );
				samplesPassed += w;
			}
		}
	}

	if( samplesPassed > 0.0 )
	{ curvature /= samplesPassed; }
	curvature = saturate( 0.5 * curvature + 0.5 );

	OUT_COLOR0 = vec4( curvature, 0.0, 0.0, 1.0 );
}
