#define SHADOWCATCHER_FLAG_SKY		(1u<<0)
#define SHADOWCATCHER_FLAG_INDIRECT	(1u<<1)

struct	AlbedoShadowCatcherParams
{
	uint	shadowFlags;
};
#define AlbedoParams	AlbedoShadowCatcherParams
