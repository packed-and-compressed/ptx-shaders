#ifndef PERLIN_BASE

#define PERLIN_BASE

uniform vec2	uPerlinUVWrap;
uniform int		uWrapPerlinUVs;

uniform int		uRandomSeedValue;

uvec2 pcg2d(uvec2 v)
{
    v = v * 1664525u + 1013904223u;

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>16u);

    v.x += v.y * 1664525u;
    v.y += v.x * 1664525u;

    v = v ^ (v>>16u);

    return v;
}

// http://www.jcgt.org/published/0009/03/02/
uvec3 pcg3d(uvec3 v) 
{
    v = v * 1664525u + 1013904223u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    v ^= v >> 16u;

    v.x += v.y*v.z;
    v.y += v.z*v.x;
    v.z += v.x*v.y;

    return v;
}

// http://www.jcgt.org/published/0009/03/02/
uvec3 pcg3d16(uvec3 v)
{
	v = v * 12829u + 47989u;

	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;

	v.x += v.y * v.z;
	v.y += v.z * v.x;
	v.z += v.x * v.y;

	v >>= 16u;

	return v;
}

//return in 0-1 range
vec2 hash(uvec2 xy)
{
	uvec2 s = xy + uRandomSeedValue;
	uvec4 u = uvec4(s, uint(s.x) ^ uint(s.y), uint(s.x) + uint(s.y)); 

	return vec2(pcg3d16(u.xyz).xy) * (1.0 / 0xffffu); 	// Performance bottleneck here.
}

vec3 hash(uvec3 v)
{
	uvec3 xyz = v + uRandomSeedValue;

	return vec3(pcg3d16(xyz)) * (1.0 / 0xffffu); 	// Performance bottleneck here.
}

float cubicInterpolate(vec4 p, float x)
{
	return p.y + 0.5 * x*(p.z - p.x + x*(2.0*p.x - 5.0*p.y + 4.0*p.z - p.w + x*(3.0*(p.y - p.z) + p.w - p.x)));
}   

float bicubicSample(vec4 m0, vec4 m1, vec4 m2, vec4 m3, vec2 xy)
{
    vec4 cubix = vec4(
        cubicInterpolate(m0, xy.y),
        cubicInterpolate(m1, xy.y),
        cubicInterpolate(m2, xy.y),
        cubicInterpolate(m3, xy.y));
   	return cubicInterpolate(cubix, xy.x);
}

float gradientNoise3D(int ix, int iy, int iz)
{
	vec3 grad = hash(uvec3(ix, iy, iz));
	return (grad.x + grad.y + grad.z)/3;
}

vec4 getPerlinStrip3D(int tx, int ty, int tz)
{
	vec4 result;
	result.x = gradientNoise3D(tx, ty, tz+0);
	result.y = gradientNoise3D(tx, ty, tz+1);
	result.z = gradientNoise3D(tx, ty, tz+2);
	result.w = gradientNoise3D(tx, ty, tz+3);
	return result;
}

float gradientNoise(int ix, int iy)
{
	float px = (float)ix;
	float py = (float)iy;
	vec2 grad = hash(uvec2(ix, iy));
	return (grad.x + grad.y)/2;
}

float gradientNoiseRepeat(int ix, int iy)
{
	float px = (float)ix;
	float py = (float)iy;

	px = mix(mix(px, px - uPerlinUVWrap.x*floor(px/uPerlinUVWrap.x), float(px >= uPerlinUVWrap.x)), px + uPerlinUVWrap.x*floor(1.0f-px/uPerlinUVWrap.x), float(px < 0.0));
	py = mix(mix(py, py - uPerlinUVWrap.y*floor(py/uPerlinUVWrap.y), float(py >= uPerlinUVWrap.y)), py + uPerlinUVWrap.y*floor(1.0f-py/uPerlinUVWrap.y), float(py < 0.0));

	vec2 grad = hash(uvec2(ix, iy));
	return (grad.x + grad.y)/2;
}

vec4 getPerlinStrip(int tx, int ty)
{
	vec4 result;
	result.x = gradientNoise(tx, ty+0);
	result.y = gradientNoise(tx, ty+1);
	result.z = gradientNoise(tx, ty+2);
	result.w = gradientNoise(tx, ty+3);
	return result;
}

vec4 getPerlinStripRepeat(int tx, int ty)
{
	vec4 result;
	result.x = gradientNoiseRepeat(tx, ty+0);
	result.y = gradientNoiseRepeat(tx, ty+1);
	result.z = gradientNoiseRepeat(tx, ty+2);
	result.w = gradientNoiseRepeat(tx, ty+3);
	return result;
}

float perlinBicubic(float x, float y)
{
	float tx = floor(x);
	float ty = floor(y);
	vec4 m0 = getPerlinStrip((int)(tx+0), (int)ty);
	vec4 m1 = getPerlinStrip((int)(tx+1), (int)ty);
	vec4 m2 = getPerlinStrip((int)(tx+2), (int)ty);
	vec4 m3 = getPerlinStrip((int)(tx+3), (int)ty);
	vec2 xy = vec2(x-tx, y-ty);
	float bc = bicubicSample(m0, m1, m2, m3, xy);
	return bc;
}

float perlinBicubicRepeat(float x, float y)
{
	float tx = floor(x);
	float ty = floor(y);
	vec4 m0 = getPerlinStripRepeat((int)(tx+0), (int)ty);
	vec4 m1 = getPerlinStripRepeat((int)(tx+1), (int)ty);
	vec4 m2 = getPerlinStripRepeat((int)(tx+2), (int)ty);
	vec4 m3 = getPerlinStripRepeat((int)(tx+3), (int)ty);
	vec2 xy = vec2(x-tx, y-ty);
	float bc = bicubicSample(m0, m1, m2, m3, xy);
	return bc;
}

float getPerlin2D(float x, float y, int sampling)
{
	float value = 0;
	if( sampling  == 0 ) value = uWrapPerlinUVs == 0 ? perlinBicubic(x, y) : perlinBicubicRepeat(x, y);
	else value = uWrapPerlinUVs == 0 ? gradientNoise((int)x, (int)y) : gradientNoiseRepeat((int)x, (int)y);
	return value;
}


float getPerlin(vec2 uv, int sampling)
{
	float result = getPerlin2D(uv.x, uv.y, sampling);
	return result;
}

float perlin3DValue(float x, float y, float z)
{
	float tx = floor(x);
	float ty = floor(y);
	float tz = floor(z);

	vec4 m00 = getPerlinStrip3D((int)(tx+0), (int)(ty)+0, (int)tz);
	vec4 m10 = getPerlinStrip3D((int)(tx+1), (int)(ty)+0, (int)tz);
	vec4 m20 = getPerlinStrip3D((int)(tx+2), (int)(ty)+0, (int)tz);
	vec4 m30 = getPerlinStrip3D((int)(tx+3), (int)(ty)+0, (int)tz);
	vec4 m01 = getPerlinStrip3D((int)(tx+0), (int)(ty)+1, (int)tz);
	vec4 m11 = getPerlinStrip3D((int)(tx+1), (int)(ty)+1, (int)tz);
	vec4 m21 = getPerlinStrip3D((int)(tx+2), (int)(ty)+1, (int)tz);
	vec4 m31 = getPerlinStrip3D((int)(tx+3), (int)(ty)+1, (int)tz);
	vec4 m02 = getPerlinStrip3D((int)(tx+0), (int)(ty)+2, (int)tz);
	vec4 m12 = getPerlinStrip3D((int)(tx+1), (int)(ty)+2, (int)tz);
	vec4 m22 = getPerlinStrip3D((int)(tx+2), (int)(ty)+2, (int)tz);
	vec4 m32 = getPerlinStrip3D((int)(tx+3), (int)(ty)+2, (int)tz);
	vec4 m03 = getPerlinStrip3D((int)(tx+0), (int)(ty)+3, (int)tz);
	vec4 m13 = getPerlinStrip3D((int)(tx+1), (int)(ty)+3, (int)tz);
	vec4 m23 = getPerlinStrip3D((int)(tx+2), (int)(ty)+3, (int)tz);
	vec4 m33 = getPerlinStrip3D((int)(tx+3), (int)(ty)+3, (int)tz);
	vec2 xz = vec2(x-tx, z-tz);

	vec4 mall;
	mall.x = bicubicSample(m00, m10, m20, m30, xz);
	mall.y = bicubicSample(m01, m11, m21, m31, xz);
	mall.z = bicubicSample(m02, m12, m22, m32, xz);
	mall.w = bicubicSample(m03, m13, m23, m33, xz);

	float result = cubicInterpolate(mall, y-ty);
	return result;
}

vec4 catmullParams(float t)
{
	vec4 params = vec4(0.0, 0.0, 0.0, 0.0);
	float t2 = t * t;
	float t3 = t2 * t;
	params.x = -0.5 * t3 + t2 - 0.5 * t;
	params.y = 3.0 / 2.0 * t3 - 5.0 / 2.0 * t2 + 1;
	params.z = -3.0 / 2.0 * t3 + 2.0 * t2 + 0.5 * t;
	params.w = 0.5 * t3 - 0.5 * t2;

	return params;
}

float perlin3DValue2(float x, float y, float z)
{
	float tx = floor(x);
	float ty = floor(y);
	float tz = floor(z);

	vec3 fractP = vec3(x - tx, y - ty, z - tz);

	vec4 paramsX = catmullParams(fractP.x);
	vec4 paramsY = catmullParams(fractP.y);
	vec4 paramsZ = catmullParams(fractP.z);

	float result = 0.0;
	vec4 mall = vec4(0.0, 0.0, 0.0, 0.0);
	vec2 xz = fractP.xz;

	HINT_UNROLL
	for (int i = 0; i <= 3; i++) {
		float v = 0.0;
		vec4 tempM;
		tempM = getPerlinStrip3D(tx, ty + i, tz);
		v += dot(tempM, paramsZ) * paramsX[0];

		tempM = getPerlinStrip3D(tx + 1, ty + i, tz);
		v += dot(tempM, paramsZ) * paramsX[1];

		tempM = getPerlinStrip3D(tx + 2, ty + i, tz);
		v += dot(tempM, paramsZ) * paramsX[2];

		tempM = getPerlinStrip3D(tx + 3, ty + i, tz);
		v += dot(tempM, paramsZ) * paramsX[3];

		result += v * paramsY[i];
	}

	return result;
}

float getPerlin3D(vec3 v, int sampling)
{
	float value = 0;
	if( sampling == 0 )
	{ value = perlin3DValue2(v.x, v.y, v.z); }
	else
	{ value = gradientNoise3D(floor(v.x), floor(v.y), floor(v.z)); }
	return value;
}

//unused dev/wip for the future

//#define GENERATE_NORMALS

#ifdef GENERATE_NORMALS

vec3 getDensityNormal(float x, float y, float z)
{
	float nx = perlin3DValue(x-0.5f, y, z);
	float ny = perlin3DValue(x, y-0.5f, z);
	float nz = perlin3DValue(x, y, z-0.5f);
	float px = perlin3DValue(x+0.5f, y, z);
	float py = perlin3DValue(x, y+0.5f, z);
	float pz = perlin3DValue(x, y, z+0.5f);
	vec3 result = vec3(px-nx,py-ny,pz-nz);
	normalize(result);
	return result;
}

vec4 getPerlinNormal3D(vec3 normal, vec3 tangent, vec3 bitangent, float x, float y, float z, int numOctaves)
{
	vec3 localNormal = getDensityNormal(x, y, z);

	float tdot = dot(tangent, localNormal);
	float bdot = dot(bitangent, localNormal);

	vec4 result;
	result.x = 0.5f+(bdot/2);
	result.y = 0.5f+(tdot/2);
	result.z = 1;
	result.w = 1;
	return result;
}

vec3 getDensityNormal2D(float x, float y, int sampling)
{
	float nx = getPerlin2D(x-0.5f, y, sampling);
	float ny = getPerlin2D(x, y-0.5f, sampling);
	float px = getPerlin2D(x+0.5f, y, sampling);
	float py = getPerlin2D(x, y+0.5f, sampling);
	vec3 result = vec3(px-nx,py-ny,1);
	normalize(result);
	return result;
}

vec4 getPerlinNormal(float x, float y, int numOctaves, int sampling)
{
	vec3 localNormal = getDensityNormal2D(x, y, sampling);

	vec3 tangent = vec3(0,1,0);
	vec3 bitangent = vec3(1,0,0);

	float tdot = dot(tangent, localNormal);
	float bdot = dot(bitangent, localNormal);

	vec4 result;
	result.x = 0.5f+(bdot/2);
	result.y = 0.5f+(tdot/2);
	result.z = 1;
	result.w = 1;
	return result;
}

#endif // GENERATE_NORMALS

#endif // PERLIN_BASE
