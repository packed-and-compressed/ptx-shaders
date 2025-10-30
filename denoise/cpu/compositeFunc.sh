#include "../../common/util.sh"

vec4	compositeFunc( vec4 color, vec3 denoised, float alpha )
{
	const float kFireflyTolerance = 0.1;

	float lumColor    = saturate( luminance( color.rgb ) );
	float lumDenoised = saturate( luminance( denoised.rgb ) );
	float blendAlpha  = lumColor > (lumDenoised + kFireflyTolerance) ? 1.0 : alpha;
	return vec4( mix( color.rgb, denoised.rgb, blendAlpha ), color.a );
}
