uniform ivec2 uTexSize;
uniform int uChunkSizeX;
uniform int uChunkSizeY;
uniform int uComponents;
uniform vec4 uNeutral;


USE_TEXTURE2D(tTex);
USE_SAMPLER(uSamp);

#ifdef COVERAGE_SECOND_PASS
USE_TEXTURE2D(tCoverageInput);
#endif

// HASH CODE FROM https://jcgt.org/published/0009/03/02/ https://www.shadertoy.com/view/XlGcRh

// commonly used constants
#define c1 0xcc9e2d51u
#define c2 0x1b873593u

uint rotr(uint x, uint r)
{
	return (x >> r) | (x << (32u - r));
}

uint xxhash32(uvec4 p)
{
    const uint PRIME32_2 = 2246822519U, PRIME32_3 = 3266489917U;
	const uint PRIME32_4 = 668265263U, PRIME32_5 = 374761393U;
	uint h32 =  p.w + PRIME32_5 + p.x*PRIME32_3;
	h32 = PRIME32_4*((h32 << 17) | (h32 >> (32 - 17)));
	h32 += p.y * PRIME32_3;
	h32 = PRIME32_4*((h32 << 17) | (h32 >> (32 - 17)));
	h32 += p.z * PRIME32_3;
	h32 = PRIME32_4*((h32 << 17) | (h32 >> (32 - 17)));
    h32 = PRIME32_2*(h32^(h32 >> 15));
    h32 = PRIME32_3*(h32^(h32 >> 13));
    return h32^(h32 >> 16);
}

// Helper from Murmur3 for combining two 32-bit values.
uint mur(uint a, uint h) {
    a *= c1;
    a = rotr(a, 17u);
    a *= c2;
    h ^= a;
    h = rotr(h, 19u);
    return h * 5u + 0xe6546b64u;
}

uint hashVec4(vec4 v, uint prev)
{
	uvec4 intVec = uvec4( v * vec4( 255.0, 255.0, 255.0, 255.0 ) );
	return mur( xxhash32( intVec )  ,prev);
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec2)
#ifdef MEASURE_COVERAGE
	//coverage output
	OUTPUT_COLOR1(float)
#endif
END_PARAMS
{
	uint		Hash32Base = 5381;
	//establish bounds
	int xStart = uChunkSizeX * int(floor(IN_POSITION.x));
	int yStart = uChunkSizeY * int(floor(IN_POSITION.y));
	int xEnd = min(xStart + uChunkSizeX, uTexSize.x);
	int yEnd = min(yStart + uChunkSizeY, uTexSize.y);
	float chunkMax = 0.0;
	uint hash = Hash32Base;
	float coverage = 0.0;
	float u1 = float(uComponents>1);
	float u2 = float(uComponents>2);
	float u3 = float(uComponents>3);
	for(int y = yStart; y < yEnd; y++)
	{
		float v = float(y)/float(uTexSize.y);
		for(int x = xStart; x < xEnd; x++)
		{
			float u = float(x)/float(uTexSize.x);
			vec4 t = abs(textureWithSamplerLod(tTex, uSamp, vec2(u, v), 0.0) - uNeutral);
			float pixelMax = t.r;
			pixelMax = max(pixelMax, t.g * u1);
			pixelMax = max(pixelMax, t.b * u2);
			pixelMax = max(pixelMax, t.a * u3);
			chunkMax = max(pixelMax, chunkMax);
			
			//count coverage, either from tTex or our coverage input
#ifdef COVERAGE_SECOND_PASS
			float coverageHere = textureWithSamplerLod(tCoverageInput, uSamp, vec2(u, v), 0.0).x;
			coverage += coverageHere;		//no step here, we just want the average on our second pass
#else 
			coverage += (pixelMax > 0.0);	//increment our count if any of our texture values is > 0
#endif
			hash = hashVec4(t, hash);
		}
	}
	//spread the hash out onto our two channels
	float red = mod(float(hash), 32768.0) / 32768.0;
	float green = floor(mod(float(hash/32768), 32768.0)) / 32768.0;
	OUT_COLOR0.rg = vec2(red, green) * ceil(min(chunkMax, 1.0));
#ifdef MEASURE_COVERAGE
	OUT_COLOR1 = coverage / (float)((yEnd-yStart) * (xEnd-xStart));
#endif
}
