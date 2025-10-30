USE_TEXTURE2D(tNormalMap);
USE_TEXTURE2D(tBumpMap);
USE_TEXTURE2D(tClipMask);

#include "blendfunctions.sh"
#include "layernoise.sh"

#include "layerbuffer.sh"
#include "layerformat.sh"

#ifdef SEAMLESS
#include "skirtPadding.sh"
#define USE_PIXEL_MASK
#include "gbufferutils.sh"
#endif

uniform vec2 uPixelSize;
uniform float uBumpWeight;

float sampleSeamless(bool useSeamless, vec2 sampleCoord)
{
	#ifdef SEAMLESS
	if(useSeamless)
	{
		int ix = getRasterPixelMapIndex( sampleCoord );
		if( ix < 0 )
		{
			RasterSkirtPixelDesc skirt = getRasterSkirtPixelDesc( ix );
			return texture2DLod( tBumpMap, skirt.remoteUV, 0.0 ).r;
		}
	}
	#endif
	return texture2DLod( tBumpMap, sampleCoord, 0.0 ).r;
}

BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
#ifdef CLIP_TEST
	float clip = texture2D( tClipMask, fBufferCoord ).g;
	if( clip <= 0.001 )
	{ discard; }
#endif
	bool useSeamless = false;
#ifdef SEAMLESS
	useSeamless = comparePixelTypeFromFCoords(fBufferCoord, GBUFFER_FLAGS_RASTER_PIXEL);
#endif

	vec4 bump = texture2DLod( tBumpMap, fBufferCoord, 0.0 );
	vec4 norm = texture2DLod( tNormalMap, fBufferCoord, 0.0 );
	norm = formatBackingColor( uBackingFormat, norm );
	norm.xyz = (2.0 * norm.rgb) - vec3(1.0,1.0,1.0);

	const float sampleRadius = 1.5; //NOTE: set this to 1.5 for smoother, texel-cracks sampling
	vec2 offset = uPixelSize * sampleRadius;
	
	float samples[8];
	/*	5 6 7
		3 . 4
		0 1 2 */
	samples[0] = sampleSeamless( useSeamless, fBufferCoord + vec2(-offset.x, -offset.y) );
	samples[1] = sampleSeamless( useSeamless, fBufferCoord + vec2(	0.0,	-offset.y) );
	samples[2] = sampleSeamless( useSeamless, fBufferCoord + vec2( offset.x, -offset.y) );

	samples[3] = sampleSeamless( useSeamless, fBufferCoord + vec2(-offset.x, 0.0) );
	samples[4] = sampleSeamless( useSeamless, fBufferCoord + vec2( offset.x,	0.0) );	

	samples[5] = sampleSeamless( useSeamless, fBufferCoord + vec2(-offset.x, offset.y) );
	samples[6] = sampleSeamless( useSeamless, fBufferCoord + vec2(	0.0,	offset.y) );
	samples[7] = sampleSeamless( useSeamless, fBufferCoord + vec2( offset.x, offset.y) );

	vec2 avgd = vec2(0.0,0.0);
	
	//cross
	float weight = 1.0/sampleRadius;
	avgd.x += ((samples[3] - bump.r) + (bump.r - samples[4])) * weight;
	avgd.y += ((samples[1] - bump.r) + (bump.r - samples[6])) * weight;
	
	//diagonals
	weight = 1.0 / (sampleRadius * 1.4142);
	float diag = ((samples[0] - bump.r) + (bump.r - samples[7])) * weight;
	avgd.x += diag;
	avgd.y += diag;
	diag = ((samples[5] - bump.r) + (bump.r - samples[2])) * weight;
	avgd.x += diag;
	avgd.y -= diag; //5-to-2 Y slope needs to be flipped
	
	//sum up a delta
	vec3 dn;
	dn.x = avgd.x * 0.25;
	dn.y = avgd.y * 0.25;
	dn.z = uBumpWeight;
	dn = normalize( dn );
	
	//add onto normal map
	dn = normalize( 
		(norm.xyz - vec3(0.0, 0.0, 1.0)) +
		(dn.xyz - vec3(0.0, 0.0, 1.0)) * bump.a +
		vec3(0.0, 0.0, 1.0)
	);
	dn.rgb = (0.5 * dn.xyz) + vec3(0.5,0.5,0.5);

	#ifdef USE_DITHER
		dn = layerDither8bit( dn.rgb, IN_POSITION.xy );
	#endif

	norm.rgb = dn.rgb;
	OUT_COLOR0 = formatOutputColor( uOutputFormat, norm );
}
