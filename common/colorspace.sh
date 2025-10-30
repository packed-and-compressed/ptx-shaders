#ifndef COLORSPACE_SH
#define COLORSPACE_SH

float	sRGBToLinear( float srgb )
{
	float black = srgb * 0.0773993808;	
	float lin = (srgb + 0.055) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin = srgb <= 0.04045 ? black : lin;
	
	return lin;
}

float	linearTosRGB( float lin )
{
	float black = 12.92 * lin;
	float srgb = (1.055) * pow( lin, 0.416666667 ) - 0.055;
	srgb = lin <= 0.0031308 ? black : srgb;
	return srgb;
}

vec2	sRGBToLinear( vec2 srgb )
{
	vec2 black = srgb * 0.0773993808;	
	vec2 lin = (srgb + vec2(0.055,0.055)) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin.r = srgb.r <= 0.04045 ? black.r : lin.r;
	lin.g = srgb.g <= 0.04045 ? black.g : lin.g;
	
	return lin;
}

vec2	linearTosRGB( vec2 lin )
{
	vec2 black = 12.92 * lin;
	vec2 srgb = (1.055) * pow( lin, 0.416666667 ) - vec2(0.055,0.055);
	srgb.r = lin.r <= 0.0031308 ? black.r : srgb.r;
	srgb.g = lin.g <= 0.0031308 ? black.g : srgb.g;
	return srgb;
}

vec3	sRGBToLinear( vec3 srgb )
{
	vec3 black = srgb * 0.0773993808;	
	vec3 lin = (srgb + vec3(0.055,0.055,0.055)) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin.r = srgb.r <= 0.04045 ? black.r : lin.r;
	lin.g = srgb.g <= 0.04045 ? black.g : lin.g;
	lin.b = srgb.b <= 0.04045 ? black.b : lin.b;
	
	return lin;
}

vec3	linearTosRGB( vec3 lin )
{
	vec3 black = 12.92 * lin;
	vec3 srgb = (1.055) * pow( lin, 0.416666667 ) - vec3(0.055,0.055,0.055);
	srgb.r = lin.r <= 0.0031308 ? black.r : srgb.r;
	srgb.g = lin.g <= 0.0031308 ? black.g : srgb.g;
	srgb.b = lin.b <= 0.0031308 ? black.b : srgb.b;
	return srgb;
}

vec3	linearTosRGBApprox( vec3 lin )
{	
	//Andres Approximation with deviation ~0.25%
	//f(x) = ( ( sqrt(x) - sqrt(x)*x)*0.921 + x*(0.4305*x + 0.5056307005) + 0.0638563) from 0.04045 to 1

	vec3 sqrtlin = sqrt(lin);
	vec3 srgb = ( (-sqrtlin*lin + sqrtlin)*0.921) + (lin*(0.4305*lin + vec3(0.5056307005, 0.5056307005, 0.5056307005)));	
	const float C = 1.055 * 0.0638563 - 0.055;
	srgb = (1.055 * srgb) + vec3(C,C,C);
	
	vec3 black = 12.92 * lin;
	srgb.r = lin.r <= 0.0031308 ? black.r : srgb.r;
	srgb.g = lin.g <= 0.0031308 ? black.g : srgb.g;
	srgb.b = lin.b <= 0.0031308 ? black.b : srgb.b;
	return srgb;
}

vec4	sRGBToLinear( vec4 srgb )
{
	vec4 black = srgb * 0.0773993808;	
	vec4 lin = (srgb + vec4(0.055,0.055,0.055,0.055)) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin.r = srgb.r <= 0.04045 ? black.r : lin.r;
	lin.g = srgb.g <= 0.04045 ? black.g : lin.g;
	lin.b = srgb.b <= 0.04045 ? black.b : lin.b;
	lin.a = srgb.a <= 0.04045 ? black.a : lin.a;
	
	return lin;
}

vec4	linearTosRGB( vec4 lin )
{
	vec4 black = 12.92 * lin;
	vec4 srgb = (1.055) * pow( lin, 0.416666667 ) - vec4(0.055,0.055,0.055,0.055);
	srgb.r = lin.r <= 0.0031308 ? black.r : srgb.r;
	srgb.g = lin.g <= 0.0031308 ? black.g : srgb.g;
	srgb.b = lin.b <= 0.0031308 ? black.b : srgb.b;
	srgb.a = lin.a <= 0.0031308 ? black.a : srgb.a;
	return srgb;
}

//============================================================
// HSV
//============================================================
// Helpers
float3 HueToRGB( float h )
{
	float r = abs(h * 6.0 - 3.0) - 1.0;
	float g = 2.0 - abs(h * 6.0 - 2.0);
	float b = 2.0 - abs(h * 6.0 - 4.0);
	return saturate( float3( r,g,b ) );
}

float3 RGBToHCV( float3 rgb )
{
	// Based on work by Sam Hocevar and Emil Persson
    float4 P = (rgb.g < rgb.b) ? float4( rgb.bg, -1.0f, 2.0f / 3.0f ) : float4( rgb.gb, 0.0f, -1.0f / 3.0f );
    float4 Q = (rgb.r < P.x) ? float4( P.xyw, rgb.r ) : float4( rgb.r, P.yzx );
    float chroma = Q.x - min( Q.w, Q.y );
    float hue = abs( ( Q.w - Q.y ) / ( 6.0f * chroma + 1e-10 ) + Q.z );
    return float3( hue, chroma, Q.x );
}

// Conversions
float3 HSVToRGB( float3 hsv )
{
	float3 RGB = HueToRGB( hsv.x );
	return ( ( RGB - 1 ) * hsv.y + 1 ) * hsv.z;
}

float3 RGBToHSV( float3 rgb )
{
	float3 HCV = RGBToHCV( rgb );
    float saturation = HCV.y / ( HCV.z + 1e-10 );
    return float3( HCV.x, saturation, HCV.z );
}

//============================================================
// YCbCr
//============================================================
float3 RGBToYCbCr(float3 rgb)
{
	float Y = dot(rgb, float3(0.299f, 0.587f, 0.114f));
	float Cb = dot(rgb, float3(-0.172f, -0.339f, 0.511f)) + 0.5f;
	float Cr = dot(rgb, float3(0.511f, -0.428f, -0.083f)) + 0.5f;
	return float3(Y, Cb, Cr);
}

float3 YCbCrToRGB(float3 ycbcr)
{
	float y = ycbcr.x;
	float cb = ycbcr.y;
	float cr = ycbcr.z;
	float r = y + 1.371f * (cr - 0.5f);
	float g = y - 0.698f * (cr - 0.5f) - 0.336f * (cb - 0.5f);
	float b = y + 1.732f * (cb - 0.5f);
	return float3(r, g, b);
}

#endif //COLORSPACE_SH
