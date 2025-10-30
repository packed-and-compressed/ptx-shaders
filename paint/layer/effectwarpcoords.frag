#include "effectperlinbase.frag"

//#define USE_TILED_WARP_UV

uniform float	uWarpAmplitude;
uniform float	uWarpFrequency;
uniform float	uWarpScale;

#define WARP_EPS 0.00001

vec2 applyWarp(vec2 coord, float scale)
{
	if( uWarpAmplitude != 0 )
	{
		scale *= uWarpScale;
		vec2 tcoord = coord * uWarpFrequency;
		float nx = getPerlin2D(tcoord.x, tcoord.y, 0) - 0.5;
		float ny = getPerlin2D(tcoord.y, tcoord.x, 0) - 0.5;
		vec2 dir = vec2(nx,ny);
		dir = normalize(dir);

		scale = uWarpAmplitude / max( scale, WARP_EPS );
		coord.xy = (dir.xy * scale) + coord.xy;
	}
	return coord;
}



vec2 applyTiledWarp(vec2 coord, vec2 mainUV, vec2 seed, float scale)
{
#ifndef USE_TILED_WARP_UV
	return applyWarp( coord, scale );
#else
	scale *= uWarpScale;
	scale *= 0.5;//this increases the warp effect to counteract smoothing from the tiling constraints..
	if( uWarpAmplitude != 0 )
	{
		//overlap 2 sections of repeating intervals
		float rpx1 = fmod(mainUV.x, 1.0);//end to end (0-1)
		float rpy1 = fmod(mainUV.y, 1.0);
		float rpx2 = fmod(mainUV.x + 0.5, 1.0);//midpoint to next midpoint
		float rpy2 = fmod(mainUV.y + 0.5, 1.0);

		//float overlapRegion = 0.5;
		const float invOverlapRegion = 2.0;

		//lerp between them from center to edges to ensure continuity
		float px = (0.5 - rpx1) * invOverlapRegion;
		float py = (0.5 - rpy1) * invOverlapRegion;

		px = min( abs(px), 1.0 );
		py = min( abs(py), 1.0 );

		rpx1 *= uWarpFrequency * scale * 2;
		rpy1 *= uWarpFrequency * scale * 2;
		rpx2 *= uWarpFrequency * scale * 2;
		rpy2 *= uWarpFrequency * scale * 2;

		rpx1 += seed.x;
		rpy1 += seed.y;
		rpx2 += seed.x;
		rpy2 += seed.y;

		//sample a warp that goes from end to end
		float nx1 = getPerlin2D(rpx1, rpy1, 0) - 0.5;
		float ny1 = getPerlin2D(rpy1, rpx1, 0) - 0.5;

		//sample a warp that goes from midpoint to midpoint
		float nx2 = getPerlin2D(rpx2, rpy2, 0) - 0.5;
		float ny2 = getPerlin2D(rpy2, rpx2, 0) - 0.5;

		vec2 dir1 = vec2(nx1,ny1);
		dir1 = normalize(dir1);
		vec2 dir2 = vec2(nx2,ny2);
		dir2 = normalize(dir2);

		dir1 *= (1.0-px)*(1.0-py);
		dir2 *= px*py;

		vec2 dir = dir1 + dir2;
		dir = normalize(dir);

		scale = uWarpAmplitude / max( scale, WARP_EPS );
		coord.xy = (dir.xy * scale) + coord.xy;
		coord += seed;
	}
	return coord;
#endif
}

vec3 applyWarp3D(vec3 coord, float scale)
{
	if( uWarpAmplitude != 0 )
	{
		scale *= uWarpScale;
		vec3 tcoord = coord * uWarpFrequency;
		float nx = getPerlin2D(tcoord.x, tcoord.y, 0);
		float ny = getPerlin2D(tcoord.y, tcoord.z, 0);
		float nz = getPerlin2D(tcoord.z, tcoord.x, 0);
		vec3 dir = vec3(nx - 0.5,ny - 0.5,nz - 0.5);
		dir = normalize(dir);
		
		scale = uWarpAmplitude / max( scale, WARP_EPS );
		coord.xyz = (dir.xyz * scale) + coord.xyz;
	}
	return coord;
}

