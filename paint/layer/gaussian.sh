#ifndef GAUSSIAN_SH
#define GAUSSIAN_SH

//per-axis guassian used for box filtering
float gaussian2D(float sigma, float r2)						{ return exp(-0.5 * (r2) / (sigma*sigma)) / (sigma * 6.283185307179586476925286766559); }

float gaussian(float sigma, float r2)						{ return exp(-0.5 * (r2) / (sigma*sigma)) / (sigma * 2.5066283); }

float gaussianNorm(float sigma)								{ return 1.0 / (sigma * 2.5066283); }
float gaussianPower(float sigma2)							{ return -0.5 / (sigma2); }
float gaussianCached(float gNorm, float gPow, float r2)		{ return gNorm * exp(gPow*(r2)); }

#endif