#include "stencilsample.frag"
#include "layer/layer.sh"

//some duplication of shader code here - this file is a hybrid of layereffect vs. painter tool -MM
//add this #define directly here (subject to change)..

#define CALC_WS_NORMAL\
	{\
	vec3 TSNormal = texture2D(tTSNormalMap, texCoord).rgb * 2.0 - 1.0;\
	vec3 tangent = fTangent;\
	l = length(tangent);\
	if(l > 0.0001)\
	{ tangent /= l; }\
	vec3 bitang = fBitangent;\
	l = length(bitang);\
	if(l > 0.0001)\
	{ bitang /= l; }\
	normHere = normalize(TSNormal.x * tangent + TSNormal.y * bitang + TSNormal.z * normHere);\
}

uniform mat4	uSymmetryMats[16];
uniform mat4	uSymmetryVPMats[16];
uniform int		uSymmetryCount;
uniform vec3	uPlanePos1;
uniform vec3	uPlanePos2;
uniform vec3	uPlaneDir1;
uniform vec3	uPlaneDir2;

uniform vec3	uFrontDir1;
uniform vec3	uFrontDir2;

uniform vec3	uSidePlanePos1;
uniform vec3	uSidePlanePos2;
uniform vec3	uSidePlaneDir1;
uniform vec3	uSidePlaneDir2;


uniform int		uRadialMode;
uniform int		uGradientMode;
uniform int		uBlendExistingAlphas;

uniform vec2	uTileValues;
uniform int		uInvertEffect;
uniform float	uContrast;


uniform int		uOrthoMode;

uniform float 	uMaxAngle;
uniform float	uFalloffAmount;
uniform vec4	uRefNormals[16]; 

USE_TEXTURE2D( tTextureColorGradient );
USE_TEXTURE2D( tTextureAlphaGradient );

USE_TEXTURE2D( tTextureOriginalSrc );
USE_TEXTURE2D( tTextureSelectionMask );

USE_TEXTURE2D( tTSNormalMap );


vec4 sampleGradientMap(float p)
{
	vec2 gradientSampleCoords = vec2(p, 0);
	vec4 result = texture2DLod( tTextureColorGradient, gradientSampleCoords, 0.0 );
	return result;
}


float gradientSample(vec2 uv)
{
	vec2 coord = uv;
	coord.x = fmod(uv.x, 1);
	coord.y = fmod(uv.y, 1);
	if( coord.x == 0 && uv.x > 0 )
	{ coord.x = 1.0f; }
	if( coord.y == 0 && uv.y > 0 )
	{ coord.y = 1.0f; }
	float result = 0;
	if( uGradientMode == 0 )//linear
	{
		//repeat linear
		result = coord.y;
	}
	else if( uGradientMode == 1 )//radial
	{
		coord.x = fmod(coord.x+0.5f, 1.0f);
		coord.y = fmod(coord.y+0.5f, 1.0f);
		float dx = 0.5f - coord.x;
		float dy = 0.5f - coord.y;
		//float dx = coord.x - 0.5f;
		//float dy = coord.y - 0.5f;
		float len = sqrt((dx*dx)+(dy*dy));
		result = len / 0.5f;
	}
	else if( uGradientMode == 2 )//reflected
	{
		result = coord.y;
	}
	else if( uGradientMode == 3 )//diamond
	{
		coord.x = fmod(coord.x+0.5f, 1.0f);
		coord.y = fmod(coord.y+0.5f, 1.0f);
		float dx = 0.5f - coord.x;
		float dy = 0.5f - coord.y;
		if( dx < 0 )
		{ dx = -dx; }
		if( dy < 0 )
		{ dy = -dy; }
		result = (dx+dy)*2;
	}
	else// ( uGradientMode == 4 )//knurled
	{
		coord.x = fmod(coord.x+0.5f, 1.0f);
		coord.y = fmod(coord.y+0.5f, 1.0f);
		float dx = 0.5f - coord.x;
		float dy = 0.5f - coord.y;
		if( dx < 0 )
		{ dx = -dx; }
		if( dy < 0 )
		{ dy = -dy; }
		result = (dx+dy)*2;
		if( result > 1 )
		{
			dx = 0.5f - dx;
			dy = 0.5f - dy;
			result = (dx+dy)*2;
		}
	}
	if( result > 1 )
	{ result = 1; }
	return result;
}

float planeDot(vec3 pos, vec3 o, vec3 dir)
{	
	vec3 d = pos-o;
	float result = (d.x*dir.x)+(d.y*dir.y)+(d.z*dir.z);
	return result;
}

//use 4 planar distances to represent a box - can be out of bounds
float getBoxGradient(vec3 pos, inout float dist)
{
	float yp1 = planeDot(pos, uPlanePos1, uPlaneDir1);
	float yp2 = planeDot(pos, uPlanePos2, uPlaneDir2);
	float xp1 = planeDot(pos, uSidePlanePos1, uSidePlaneDir1);
	float xp2 = planeDot(pos, uSidePlanePos2, uSidePlaneDir2);
	
	vec2 sampleUV;
	sampleUV.x = 0;
	sampleUV.y = 0;
	if( xp1 < 0 )
	{
		float refDistance = xp2+xp1;
		sampleUV.x = xp1/refDistance;
	}
	else if( xp2 < 0 )
	{
		float refDistance = xp1+xp2;
		sampleUV.x = 1.0 - (xp2/refDistance);
	}
	else
	{ sampleUV.x = xp1 / (xp1+xp2); }
	if( yp1 < 0 )
	{
		float refDistance = yp2+yp1;
		sampleUV.y = yp1/refDistance;
	}
	else if( yp2 < 0 )
	{
		float refDistance = yp1+yp2;
		sampleUV.y = 1.0 - (yp2/refDistance);
	}
	else
	{ sampleUV.y = yp1 / (yp1+yp2); }

	float value = 1;
	dist = length(sampleUV - vec2(0.5, 0.0));
	if( uGradientMode == 1 )		//radial
	{
		sampleUV.x -= 0.5;
		sampleUV = abs(sampleUV);
		if( !(sampleUV.x > 1 || sampleUV.y > 1) )
		{
			sampleUV *= uTileValues*0.5f;
			value = gradientSample(sampleUV);
		}
		else
		{ dist = 9999.0; }
	}
	else if( uGradientMode == 3 || uGradientMode == 4 )	//diamond/knurl
	{
		sampleUV.x = sampleUV.x * 0.5 + 0.75;
		sampleUV.y *= 0.5;
		sampleUV = abs(sampleUV) * uTileValues.xy;
		value = gradientSample(sampleUV);
	}
	else		//normal/reflected
	{
		if( uGradientMode == 0 )
		{ sampleUV = max(sampleUV, 0.0); }
		else if( uGradientMode == 2 )
		{ sampleUV = abs(sampleUV); }
		sampleUV = min(sampleUV, 1.0);
		value = gradientSample(sampleUV);
	}

	return value;
}

float calcFalloff(vec3 ref, vec3 test)
{
	float dotProduct = dot(ref, test);
	float result = angleFalloff(dotProduct, uMaxAngle, uFalloffAmount);
	return saturate(result);
}

vec4 sampleGradient(vec3 pos, vec3 normal, inout float bestValue)
{
	bestValue = 0.0;
	float bestDist;
	bestValue = getBoxGradient(mulPoint(uSymmetryMats[0], pos).xyz, bestDist);
	//hold onto our best and second-best values for some anti-aliasing
	float secondBestValue = bestValue;
	float secondBestDist = bestDist;
	float dDistX0 = dFdx(bestDist);
	float dDistY0 = dFdy(bestDist);
	float bestDeltaDist = dDistX0 * dDistX0 + dDistY0 * dDistY0;	//used for anti-aliasing

	//sample the stencil per symmetry instance
	vec4 stencilCoord = mulPoint(uSymmetryVPMats[0], pos);
	float bestStencil = sampleStencil(stencilCoord.xy/stencilCoord.w);
	bestStencil *= calcFalloff(uRefNormals[0].xyz, normal);

	//sample the different gradients and blend them together based on their distance
	
	for(int i = 1; i < clamp(uSymmetryCount, 1, 16); i++)
	{
		float dist;
		stencilCoord = mulPoint(uSymmetryVPMats[uSymmetryCount-i], pos); 
		float thisStencil = sampleStencil(stencilCoord.xy/stencilCoord.w);
		thisStencil *= calcFalloff(uRefNormals[uSymmetryCount-i].xyz, normal);
		float nv = getBoxGradient(mulPoint(uSymmetryMats[i], pos).xyz, dist);
		bestStencil = max(bestStencil, thisStencil);
		float newIsBest = step(dist, bestDist);
		
		secondBestDist = mix(secondBestDist, bestDist, newIsBest);
		secondBestValue = mix(secondBestValue, bestValue, newIsBest);
		float dDistX = dFdx(dist);
		float dDistY = dFdy(dist);
		bestDeltaDist = mix(bestDeltaDist, dDistX*dDistX+dDistY*dDistY, newIsBest);
		bestValue = mix(bestValue, nv, newIsBest);
		bestDist = mix(bestDist, dist, newIsBest);
	}
	bestDeltaDist = sqrt(bestDeltaDist);
	vec4 c1 = sampleGradientMap(bestValue);
	vec4 c2 = sampleGradientMap(secondBestValue);
	c1.a *= bestStencil;
	c2.a *= bestStencil;
	float attenuation = abs(bestDist-secondBestDist) / max(bestDeltaDist, 0.001); 
	if(abs(bestDist-secondBestDist) < bestDeltaDist * 1.5)	//if we're really close, blend the colors together
	{ return mix(c2, c1, saturate(0.5 + attenuation)); }
	return c1;
}


BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	INPUT1( vec3, fPosition )
	INPUT3( vec3, fNormal )
	INPUT4( vec3, fTangent )
	INPUT5( vec3, fBitangent )	
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{


	float l;
	vec3 normHere = fNormal;
	vec2 texCoord = fBufferCoord;
	CALC_WS_NORMAL;

	vec4 outputColor;
	vec4 selectionMask = texture2DLod( tTextureSelectionMask, fBufferCoord, 0.0 );
	float alphaLerp = selectionMask.x;

	float value = 0.0;
	vec3 dpdx = dFdx(fPosition);
	vec3 dpdy = dFdy(fPosition);
	
	//multi-sample!
	outputColor =  sampleGradient(fPosition + dpdx * -0.25 + dpdy * -0.25, normHere, value);
	outputColor += sampleGradient(fPosition + dpdx * 0.25 + dpdy * -0.25, normHere, value);
	outputColor += sampleGradient(fPosition + dpdx * 0.25 + dpdy * 0.25, normHere, value);
	outputColor += sampleGradient(fPosition + dpdx * -0.25 + dpdy * 0.25, normHere, value);
	outputColor *= 0.25;
	float stencil = outputColor.a;
	outputColor.rgb = mix(outputColor.rgb, vec3(1.0, 1.0, 1.0)-outputColor.rgb, float(uInvertEffect));

	outputColor = lerp( vec4(0.5,0.5,0.5,1.0), outputColor, uContrast );		//amount is noise contrast, i.e. lerp between flat gray and noise
	vec2 gradientSampleCoords = vec2(value, 0);
	vec4 alpha = texture2DLod( tTextureAlphaGradient, gradientSampleCoords, 0.0 );
	alpha *= stencil;
	outputColor.w = alpha.x * alphaLerp; 
	vec4 colorIn = formatBackingColor(uBackingFormat, texture2DLod( tTextureOriginalSrc, fBufferCoord, 0.0 ));
	outputColor = blendRGBA(colorIn, outputColor);

	OUT_COLOR0 = formatOutputColor(uBackingFormat, outputColor);
}

