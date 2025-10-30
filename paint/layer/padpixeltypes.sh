#ifndef PAD_PIXEL_TYPES
#define PAD_PIXEL_TYPES

uint	packUV( vec2 uv )
{
	uv.x = uv.x != 1.0f ? frac(uv.x) : uv.x;
	uv.y = uv.y != 1.0f ? frac(uv.y) : uv.y;
	uv = (uv * 65535.0) + 0.5;
	return (((uint)uv.x) << 16) + ((uint)uv.y);
}

vec2	unpackUV( unsigned int packed )
{
	return vec2(
		float(packed >> 16) * (1.0/65535.0),
		float(packed & 0xffff) * (1.0/65535.0)
	);
}

struct	RasterIslandPixelDesc
{
	uint	triangleIndex;	//original raster triangle
	uint	groupIndex;		//group index
	float	sdf;			//SDF value
};

struct	RasterSkirtPixelDesc
{
	vec2	remoteUV;			//remote "virtual" texture coords
	vec2	originUV;			//origin island texture coords
	uint	triangleIndex;		//original raster triangle
	uint	groupIndex;			//group index
	float	tangentRotation;	//tangent space rotation, [0,2pi]
	uint	unused;				//data structure padding needed for MacOS alignment
};


#endif
