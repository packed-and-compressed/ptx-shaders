#include "effectperlinbase.frag"

float getTurbulence(vec2 coord, float frequency, float amplitude)
{
	float value = getPerlin2D(coord.x, coord.y, 0);
	float offset = coord.x+coord.y;
	value = sin(frequency*(offset+(value*amplitude)));
	value = (value+1)/2;
	return value;
}

float getTurbulence3D(vec3 coord, float frequency, float amplitude)
{
	float value = perlin3DValue(coord.x, coord.y, coord.z);
	float offset = coord.x+coord.y+coord.z;
	value = sin(frequency*(offset+(value*amplitude)));
	value = (value+1)/2;
	return value;
}

