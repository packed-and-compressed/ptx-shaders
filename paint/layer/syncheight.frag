#include "../../common/const.sh"
#include "../../common/rng.comp"

#include "data/shader/common/udim.sh"
#include "data/shader/common/globalTextures.sh"

#define BINDLESS
#ifdef SEAMLESS
	#include "skirtPadding.sh"
#endif

USE_SAMPLER( sNormalSampler );
USE_SAMPLER( sHeightSampler );

uniform uint	uNormalMaps[UDIM_MAX_TILES_IN_SHAPE];
uniform uint	uPrevHeightMaps[UDIM_MAX_TILES_IN_SHAPE];
uniform uint2	uProjectShape;
uniform vec2	uUDIMTile;

USE_INTERLOCKED_BUFFER( bHeightRange, 1 );
uniform vec2 uInverseResolution;
uniform uint uStoreHeightRange;

void	resolveUDIMValues( vec2 texCoord, uint2 shape, out uint mapIndex )
{
	uint arrayOffset;
	if( calculateUDIMArrayOffset( texCoord.xy, shape.x, shape.y, arrayOffset ) )
	{ mapIndex = uNormalMaps[arrayOffset]; }
	else
	{ mapIndex = 0; }
}

int		floatToOrderedInt( float floatVal )
{
	int intVal = asint( floatVal );
	return ( intVal >= 0 ) ? intVal : intVal ^ 0x7FFFFFFF;
}

vec3	sampleNormals( vec2 coord, out bool valid )
{
	uint mapIndex;
	resolveUDIMValues( coord, uProjectShape, mapIndex );

	vec3 n = vec3( 0.0f, 0.0f, 1.0f );
	valid = false;
	if( mapIndex )
	{
		vec2 s =  textureWithSamplerLod( resourceByIndex( tGlobalTextures, mapIndex ), sNormalSampler, frac( coord ), 0.0 ).xy;
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
	//early out: skip pixels outside UV island
	#ifdef SEAMLESS
		uint arrayOffset;
		int pixelMapIndex = getRasterPixelMapIndex( fBufferCoord + uUDIMTile, arrayOffset );
		if( pixelMapIndex == 0 )
		{
			OUT_COLOR0 = vec4( 0,0,0,0 );
			return;
		}
	#endif

	float heightVotes = 0.0;
	float H = 0.0;

	HINT_UNROLL
	for( uint d=0; d<4; ++d )
	{
		vec2 dir = vec2(
			d == 0 ? 1.0 : d == 2 ? -1.0 : 0.0,
			d == 1 ? 1.0 : d == 3 ? -1.0 : 0.0
		);
		vec2 step = dir * uInverseResolution;
		vec2 c = fBufferCoord + uUDIMTile;
		float h = 0.0;
		mat3 reorient = mat3( 1,0,0, 0,1,0, 0,0,1 );

		HINT_UNROLL
		for( uint s=0; s<2; ++s )
		{
			c += step;
				
			bool valid;
			vec3 normal = sampleNormals( c, valid );
			#ifdef SEAMLESS
				if( !valid )
				{
					uint arrayOffset;
					int ix = getRasterPixelMapIndex( c, arrayOffset );
					if( ix < 0 )
					{
						RasterSkirtPixelDesc skirt = getRasterSkirtPixelDesc( ix, arrayOffset );
						c = skirt.remoteUV;
						float sinTheta, cosTheta;
						sincos( -skirt.tangentRotation, sinTheta, cosTheta );
						step.xy =	step.x * vec2(cosTheta,sinTheta) +
									step.y * vec2(-sinTheta,cosTheta);
						normal = sampleNormals( c, valid );

						#ifdef TANGENT_REORIENTATION
							mat3 r = transpose( getRasterSkirtReorientation( ix, arrayOffset ) );
							reorient = mul( r, reorient );
						#endif
					}
				}
			#endif
			#if 0
				//More accurate gradient computation, but nobody seems
				//to like the visual result? This is only "height" generation
				//anyway I guess. Hmmpf. -jdr
				vec2 gradient = vec2(0,0);
				if( normal.z > 0.0 )
				{ gradient = -normal.xy / normal.z; }
			#else
				vec2 gradient = -normal.xy;
			#endif

			if( valid )
			{
				#ifdef TANGENT_REORIENTATION
					float rise = dot( step, gradient );
					vec3 p = mul( reorient, vec3( step.xy, rise ) );
					h += p.z;
				#else
					h += dot( step, gradient );
				#endif

				uint arrayOffset;
				if( calculateUDIMArrayOffset( c.xy, uProjectShape.x, uProjectShape.y, arrayOffset ) && arrayOffset != ~0u )
				{
					uint prevHeightIndex = uPrevHeightMaps[arrayOffset];
					H += textureWithSamplerLod( resourceByIndex( tGlobalTextures, prevHeightIndex ), sHeightSampler, frac( c ), 0.0 ).x - h;
					heightVotes += 1.0;
				}
			}
		}
	}

	if( heightVotes > 0.0 )
	{ H /= heightVotes; }

	if( isnan( H ) )
	{
		H = 0.0;
	}

	OUT_COLOR0 = vec4( H, 0.0, 0.0, 1.0 );

	HINT_BRANCH
	if( uStoreHeightRange != 0 )
	{
		int previous = 0; // unused
		#ifdef CPR_METAL
			interlockedMin( (volatile device atomic_int*) bHeightRange, 0, floatToOrderedInt( H ), previous );
			interlockedMax( (volatile device atomic_int*) bHeightRange, 1, floatToOrderedInt( H ), previous );
		#else
			interlockedMin( bHeightRange, 0, floatToOrderedInt( H ), previous );
			interlockedMax( bHeightRange, 1, floatToOrderedInt( H ), previous );
		#endif
	}
}
