#ifndef MSET_SCATTER_UTIL_SH
#define MSET_SCATTER_UTIL_SH

float wrapLight(float DP, float scatter)
{ return saturate( DP*(1.0-scatter) + scatter ); }

float wrapLightIntegral(float scatter)
{ return 0.31830988618379 / (1.0 + scatter); }	//1/(pi*scatter + pi)

float wrapLightSquared(float DP, float scatter)
{ float res = saturate( DP*(1.0-scatter) + scatter ); return res*res; }

float wrapLightSquaredIntegral(float scatter) 
{ return 1.0 / ((2.0/3.0*3.1415962) * (scatter*scatter + scatter + 1.0)); }

float diffuseFresnel(float eyeDP, float scatter)
{
	eyeDP = 1.0 - eyeDP;
	float dp4 = eyeDP * eyeDP; dp4 *= dp4;
	eyeDP = lerp(dp4, eyeDP*0.4, scatter);	//0.4 is energy conserving integral
	return eyeDP;
}

float diffuseFresnel(float eyeDP, float scatter, float occ, float occWeight)
{
	eyeDP = diffuseFresnel(eyeDP, scatter);
	return lerp(eyeDP, eyeDP*occ, occWeight);
}

vec3 diffuseFresnel3(float eyeDP, float scatter, vec3 occ, float occWeight)
{
	eyeDP = diffuseFresnel(eyeDP, scatter);
	return lerp(vec3(eyeDP,eyeDP,eyeDP), eyeDP*occ, occWeight);
}

float computeTranslucencyDepth(float objDepth, float shadowDepth, float scale)
{
	float s = saturate( (objDepth - shadowDepth*0.997) * scale);
	return s;
}

float gaussian(float sigma, float r2)
{ return exp(-0.5 * r2 / (sigma*sigma)) / (sigma * 2.5066283); }

vec3 gaussian3(vec3 sigma, float r2)
{ return exp(-0.5 * r2 / (sigma*sigma)) / (sigma * 2.5066283); }

float gaussianNorm(float sigma)
{ return 1.0 / (sigma * 2.5066283); }

vec3 gaussianNorm3(vec3 sigma)
{ return vec3(1.0,1.0,1.0) / (sigma * 2.5066283); }

float gaussianPower(float sigma2)
{ return -0.5 / (sigma2); }

vec3 gaussianPower3(vec3 sigma2)
{ return vec3(-0.5,-0.5,-0.5) / (sigma2); }

float gaussianCached(float gaussianPow, float r2)
{ return exp(gaussianPow * r2); }

vec3 gaussianCached3(vec3 gaussianPow, float r2)
{ return exp(gaussianPow * r2); }

#endif
