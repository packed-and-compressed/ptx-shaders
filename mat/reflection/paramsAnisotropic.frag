#ifndef ANISOGGX_FLAG_SWAPXY
#define ANISOGGX_FLAG_SWAPXY	(1u<<27)
#endif

struct	ReflectionAnisoGGXParams
{
	uint	directionTexture;
	uint	directionScaleBias;
	uint	rotation;
	float	aspect;
};

#ifdef SUBROUTINE_SECONDARY
	#define ReflectionParamsSecondary	ReflectionAnisoGGXParamsSecondary
#else
	#define ReflectionParams			ReflectionAnisoGGXParams
#endif
