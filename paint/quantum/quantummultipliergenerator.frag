//This shader picks coefficents that let us approximate a 4-segment piecewise with just 3 32-bit textures
#include "quantummultiplication.sh"

USE_TEXTURE2D(tTex0);
USE_TEXTURE2D(tTex1);
USE_TEXTURE2D(tTex2);
USE_TEXTURE2D(tTex3);
USE_TEXTURE2D(tTex4);
USE_TEXTURE2D(tTex5);

					 
int pickCoefficient(float v0, float vf, float vx, float x)
{
	float t = 0.5;
	if(abs(vf-v0) > 0.001)
	{
		t = (vx-v0)/(vf-v0);
	}
#ifdef QC_FOUR_CHANNEL_CURVES
	return int(saturate(t) * 255.0 + 0.01);
#endif
	int best = 0;
	float bestResult = abs(getMult(best)-t);
	for(int i = 1; i < 16; i++)
	{
		float delta = abs(getMult(i)-t);
		if(delta < bestResult)
		{ best = i; bestResult = delta; } 
	}
	return best;
}

//picks all three coeffient indices for a channel
uint pickAll(float v0, float v1, float v2, float v3, float v4, float v5)
{
	int i0 = pickCoefficient(v0, v5, v1, 0.2);
	int i1 = pickCoefficient(v0, v5, v2, 0.4);
	int i2 = pickCoefficient(v0, v5, v3, 0.6);
	int i3 = pickCoefficient(v0, v5, v4, 0.8);
//	i0 = 1;
//	i1 = 4;
//	i2 = 9;
	return encodeUint(i0, 12, 4) + encodeUint(i1, 8, 4) + encodeUint(i2, 4, 4) + encodeUint(i3, 0, 4);
}

//picks all three coeffient indices for a channel
vec4 pickAllVec4(float v0, float v1, float v2, float v3, float v4, float v5)
{
	int i0 = pickCoefficient(v0, v5, v1, 0.2);
	int i1 = pickCoefficient(v0, v5, v2, 0.4);
	int i2 = pickCoefficient(v0, v5, v3, 0.6);
	int i3 = pickCoefficient(v0, v5, v4, 0.8);
//	i0 = 1;
//	i1 = 4;
//	i2 = 9;
	return vec4(v1, v2, v3, v4);
	return vec4(ivec4(i0, i1, i2, i3))/255.0;
}



BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
OUTPUT_COLOR1( vec4 )
OUTPUT_COLOR2( vec4 )
END_PARAMS
{
	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	vec4 t0 = texture2D(tTex0, tc); 
	vec4 t1 = texture2D(tTex1, tc);
	vec4 t2 = texture2D(tTex2, tc);
	vec4 t3 = texture2D(tTex3, tc);
	vec4 t4 = texture2D(tTex4, tc);
	vec4 t5 = texture2D(tTex5, tc);
#ifndef QC_FOUR_CHANNEL_CURVES
	uint r = pickAll(t0.r, t1.r, t2.r, t3.r, t4.r, t5.r);
	uint g = pickAll(t0.g, t1.g, t2.g, t3.g, t4.g, t5.g);
	uint b = pickAll(t0.b, t1.b, t2.b, t3.b, t4.b, t5.b);
	
//	r = pickAll(0.0, f1(0.2), f1(0.4), f1(0.6), f1(.8), 1.0);
//	g = pickAll(0.0, f2(0.2), f2(0.4), f2(0.6), f2(.8), 1.0);
//	b = pickAll(0.0, f3(0.2), f3(0.4), f3(0.6), f3(.8), 1.0);
	
//	g = encodeUint(7, 12, 4) + encodeUint(8, 8, 4) + encodeUint(13, 4, 4) + encodeUint(15, 0, 4); 
	float bias = 0.25 / 65535.0;		//without this, float encoding can be flakey
	
	OUT_COLOR0.r = extractFloat(r, 0, 16) + bias;
	OUT_COLOR1.r = extractFloat(g, 0, 16) + bias;
	OUT_COLOR2.r = extractFloat(b, 0, 16) + bias;

	OUT_COLOR0.gba = vec3(0.0, 0.0, 0.0);
	OUT_COLOR1.gba = vec3(0.0, 0.0, 0.0);
	OUT_COLOR2.gba = vec3(0.0, 0.0, 0.0);
#else
	OUT_COLOR0 = pickAllVec4(t0.r, t1.r, t2.r, t3.r, t4.r, t5.r);
	OUT_COLOR1 = pickAllVec4(t0.g, t1.g, t2.g, t3.g, t4.g, t5.g);
	OUT_COLOR2 = pickAllVec4(t0.b, t1.b, t2.b, t3.b, t4.b, t5.b);
#endif

}

