USE_TEXTURE2D(tNormalMap);		//accumulated normals
USE_TEXTURE2D(tBaseNormalMap);	//input normals

uniform vec3	uNormalScale;
uniform vec3	uNormalBias;

uniform vec3	uBaseNormalScale;
uniform vec3	uBaseNormalBias;

uniform vec3	uOutputScale;
uniform vec3	uOutputBias;

#ifdef USE_BUMP
	USE_TEXTURE2D(tBumpMap);	//accumulated bump
	uniform vec2	uBumpPixelSize;
	uniform float	uBumpWeight;
#endif

#include "layernoise.sh"

#ifdef USE_BUMP
vec4 sampleBump( vec2 texcoord )
{
	return texture2DLod( tBumpMap, texcoord, 0.0 ).rrrg;
}
#endif 

#ifdef USE_BUMP
	BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
	OUTPUT_COLOR1( vec4 )
	END_PARAMS
#else
	BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
	END_PARAMS
#endif
{
	vec2 paddedCoord = fBufferCoord;

	vec4 norm = texture2DLod( tNormalMap, paddedCoord, 0.0 );
	norm.xyz = (norm.xyz * uNormalScale) + uNormalBias;
	
	vec4 baseNorm = texture2DLod( tBaseNormalMap, paddedCoord, 0.0 );	
	baseNorm.xyz = (baseNorm.xyz * uBaseNormalScale) + uBaseNormalBias;

	#ifdef USE_BUMP
		vec4 bump = texture2DLod( tBumpMap, paddedCoord, 0.0 ).rrrg;
		
		const float sampleRadius = 1.5; //NOTE: set this to 1.5 for smoother, texel-cracks sampling
		const float invSampleRadius = 0.66666666667;
		vec2 offset = uBumpPixelSize * sampleRadius;
	
		float samples[8];
		/*	5 6 7
			3 . 4
			0 1 2 */
		samples[0] = sampleBump( fBufferCoord + vec2(-offset.x, -offset.y) ).r;
		samples[1] = sampleBump( fBufferCoord + vec2(	0.0,	-offset.y) ).r;
		samples[2] = sampleBump( fBufferCoord + vec2( offset.x, -offset.y) ).r;

		samples[3] = sampleBump( fBufferCoord + vec2(-offset.x, 0.0) ).r;
		samples[4] = sampleBump( fBufferCoord + vec2( offset.x,	0.0) ).r;	

		samples[5] = sampleBump( fBufferCoord + vec2(-offset.x, offset.y) ).r;
		samples[6] = sampleBump( fBufferCoord + vec2(	0.0,	offset.y) ).r;
		samples[7] = sampleBump( fBufferCoord + vec2( offset.x, offset.y) ).r;

		vec2 avgd = vec2(0.0,0.0);
	
		//cross
		float weight = invSampleRadius;
		avgd.x += ((samples[3] - bump.r) + (bump.r - samples[4])) * weight;
		avgd.y += ((samples[1] - bump.r) + (bump.r - samples[6])) * weight;
	
		//diagonals
		weight = invSampleRadius * 0.70710678118654752440084436210485;	// 1 / sqrt(2)
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
		norm.xyz = normalize( 
			(norm.xyz - vec3(0.0, 0.0, 1.0)) +
			(dn.xyz - vec3(0.0, 0.0, 1.0)) * bump.a +
			vec3(0.0, 0.0, 1.0)
		);
		
		//detail normal
		OUT_COLOR1.rgb = (norm.xyz * uOutputScale) + uOutputBias;
		OUT_COLOR1.a = norm.a;		
	#endif
		
	norm.xyz = normalize( 
		(baseNorm.xyz - vec3(0.0, 0.0, 1.0)) +
		(norm.xyz -		vec3(0.0, 0.0, 1.0)) * norm.a +
		vec3(0.0, 0.0, 1.0)
	);

	//detail + base normal
	OUT_COLOR0.rgb = (norm.xyz * uOutputScale) + uOutputBias;
	OUT_COLOR0.a = norm.a;
}
