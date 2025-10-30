#ifndef DIRECTION_MAP_FLAG_NONE
#define DIRECTION_MAP_FLAG_NONE (0)
#endif

#ifndef DIRECTION_MAP_FLAG_SCALEBIAS
#define DIRECTION_MAP_FLAG_SCALEBIAS (1 << 0)
#endif

#ifndef DIRECTION_MAP_FLAG_SWAP_XY
#define DIRECTION_MAP_FLAG_SWAP_XY (1 << 1)
#endif

struct	ReflectionBCSDFParams
{
	uint type;
	packed_vec3 sin2kAlpha;
	packed_vec3 cos2kAlpha;

	uint radialRoughnessMap;
	uint radialRoughnessScaleBias;

	uint directionMap;
	uint flags;
	uint rotation;
};

#ifdef SUBROUTINE_SECONDARY
#define ReflectionParamsSecondary	ReflectionBCSDFParamsSecondary
#else
#define ReflectionParams			ReflectionBCSDFParams
#endif
