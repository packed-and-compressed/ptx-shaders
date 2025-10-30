#include "../common/const.sh"
#include "lenssystem.comp"

uniform vec3 uLightPos; // xy: ndc, z: viewspace z
uniform vec4 uLightParams; // xyz: color, w: brightness

USE_TEXTURE2D_NOSAMPLER(tAperture);
USE_SAMPLER(sAperture);
USE_TEXTURE2D_NOSAMPLER(tDepth);
USE_SAMPLER(sDepth);

BEGIN_PARAMS
    INPUT0(vec3,Payload)
    INPUT1(vec2,Ndc)
    INPUT2(vec4,Reflectance)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float w, h, mips;
	imageSize2D(tDepth, w, h, mips);

	// Texel size
	float dx = 1.0f / (float)w;
	float dy = 1.0f / (float)h;
	const vec2 offsets[9] =
	{
		vec2(-dx, -dy), vec2(0, -dy), vec2(dx, -dy),
		vec2(-dx,   0), vec2(0,   0), vec2(dx,   0),
		vec2(-dx, +dy), vec2(0, +dy), vec2(dx, +dy)
	};

	vec2 uv = vec2(uLightPos.x * 0.5f + 0.5f, -uLightPos.y * 0.5f + 0.5f);

	float percentage = 0.0f;
	HINT_UNROLL
	for(int i = 0; i < 9; ++i)
	{
		float depth = textureWithSampler( tDepth, sDepth, uv + offsets[i] ).r;
		if (depth < uLightPos.z)
		{
			percentage += 1.0f;
		}
	}
	percentage /= 9.0f;

	const float fade = 0.2;
	float lensDistance = length(Ndc);
	float sunDisk = 1.0 - saturate((lensDistance - 1.0 + fade) / fade);
	sunDisk = smoothstep(0.0, 1.0, sunDisk) * lerp(0.8, 1.0, saturate(lensDistance));

	float alpha1 = Payload.z < 1.0;
	float alpha2 = sunDisk;
	float alpha3 = textureWithSampler( tAperture, sAperture, Payload.xy ).r;
	float alpha4 = Reflectance.w;
	float alpha = alpha1 * alpha2 * alpha3 * alpha4;

	clip(alpha == 0.0 ? -1.0f : 1.0f);

	OUT_COLOR0 = vec4(alpha * Reflectance.rgb * uLightParams.xyz * uLightParams.w * percentage, 1.0);
}
