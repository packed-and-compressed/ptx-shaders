#include "../common/util.sh"
#include "../common/rng.comp"

USE_TEXTURE2D( tFilmGrainNoise );
USE_TEXTURE2D( tFilmGrainCurves );

uniform float uFilmGrainParams; // x: uIntensity
uniform mat4x4 uFilmGrainTransform;

// c: input color
// cuv: viewport uv

vec3		   filmgrainTexture( vec3 c, vec2 cuv )
{
	float uIntensity = uFilmGrainParams;

	int w, h, mips;
	imageSize2D(tFilmGrainNoise, w, h, mips);

	// Apply texture tiling, random rotation, and translation
	// cuv is SV_Position, this is used to ensure texture have correct aspect ratio and it maintains 1:1 pixel
	vec2 uv = cuv / float2(w, h);
	uv = mulPoint( uFilmGrainTransform, vec3( uv, 0.0f ) ).xy;

	vec3 src = c;
	vec3 dst = texture2D(tFilmGrainNoise,uv).rgb;
	dst = 2.0f * dst - 1.0f; // Uncompress each component from [0,1] to [-1,1].

	vec3 mask = vec3( 1.0f, 1.0f, 1.0f ) - c;
	vec3 curveCoord = ( 255.0 / 256.0 ) * mask.xyz + vec3( 0.5 / 256.0, 0.5 / 256.0, 0.5 / 256.0 );
	mask.x = texture2D( tFilmGrainCurves, curveCoord.xx ).x;
	mask.y = texture2D( tFilmGrainCurves, curveCoord.yy ).y;
	mask.z = texture2D( tFilmGrainCurves, curveCoord.zz ).z;

	return src + mix( vec3( 0.0f, 0.0f, 0.0f ), dst * uIntensity, mask );
}

#define FilmGrain filmgrainTexture
