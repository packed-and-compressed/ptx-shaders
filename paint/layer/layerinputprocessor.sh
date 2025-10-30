#ifndef LAYER_INPUT_PROCESSOR_SH
#define LAYER_INPUT_PROCESSOR_SH

#include "layerinput.sh"
#include "layerbuffer.sh"

#define BLUR_SAMPLE_COUNT 19
USE_TEXTURE2D( tTempInputMap );

uniform vec2	uProcessorKernel[BLUR_SAMPLE_COUNT];
uniform int		uProcessorSampleCount;
uniform float	uProcessorSampleWeight[BLUR_SAMPLE_COUNT];

struct ProcessorParams
{
	float invert;
	float intensity;
	float contrast;
	float contrastCenter;
	float sharpness;
	float blurOrSharp;
	float blurRadius;
};

ProcessorParams ProcessorParamsDefault()
{
	ProcessorParams proc;
	proc.invert = 0.0;
	proc.intensity = 1.0;
	proc.contrast = 1.0;
	proc.contrastCenter = 0.5;
	proc.sharpness = 0.0;
	proc.blurOrSharp = 0.0;
	proc.blurRadius = 0.0;
	return proc;
}

ProcessorParams ProcessorParamsConstructor(
	float invert,
	float intensity,
	float contrast,
	float contrastCenter,
	float sharpness,
	float blurOrSharp,
	float blurRadius )
{
	ProcessorParams proc;
	proc.invert = invert;
	proc.intensity = intensity;
	proc.contrast = contrast;
	proc.contrastCenter = contrastCenter;
	proc.sharpness = sharpness;
	proc.blurOrSharp = blurOrSharp;
	proc.blurRadius = blurRadius;
	return proc;
}

#define USE_PROCESSOR(NAME) \
	uniform float uInvert##NAME;\
	uniform float uIntensity##NAME;\
	uniform float uContrast##NAME;\
	uniform float uContrastCenter##NAME;\
	uniform float uSharpness##NAME;\
	uniform float uBlurOrSharp##NAME;\
	uniform float uBlurRadius##NAME;

#define getProcessorParams(NAME) ProcessorParamsConstructor(\
	uInvert##NAME,\
	uIntensity##NAME,\
	uContrast##NAME,\
	uContrastCenter##NAME,\
	uSharpness##NAME,\
	uBlurOrSharp##NAME,\
	uBlurRadius##NAME )

///

float _contrast1f( float value, float contrast, float center )
{
	value = (value - center) * contrast + center;	
	return value;
}

vec3 _contrast3f( vec3 value, float contrast, float center )
{
	value.x = (value.x - center) * contrast + center;
	value.y = (value.y - center) * contrast + center;
	value.z = (value.z - center) * contrast + center;
	return value;
}

float _invert1f( float value, float invert )
{
	return ( ( (-2.0*value) + 1.0) * invert ) + value;  // 2 instruction invert: A = A - 2Ai + i	
} 

vec3 _invert3f( vec3 value, float invert )
{ 
	return ( ( (-2.0*value) + vec3(1.0,1.0,1.0) ) * invert ) + value; 
}

float _sharp1f( float origin, float sum, float sharpness )
{ return ( origin + (origin - sum) * sharpness ); }

vec3 _sharp3f( vec3 origin, vec3 sum, float sharpness )
{ return ( origin + (origin - sum) * sharpness ); }

///

float processValue( float origin, float sum, ProcessorParams proc )
{
	origin =	_contrast1f( origin, proc.contrast, proc.contrastCenter );
	sum =		_contrast1f( sum, proc.contrast, proc.contrastCenter );	
	float s =	_sharp1f( origin, sum, proc.sharpness );
	sum =		mix( sum, s, proc.blurOrSharp );
	sum *=		proc.intensity;
	sum =		_invert1f( sum, proc.invert );
	return saturate( sum );
}

vec4 processColor( vec4 origin, vec4 sum, ProcessorParams proc )
{
	origin.rgb = _contrast3f( origin.rgb, proc.contrast, proc.contrastCenter );
	sum.rgb =	 _contrast3f( sum.rgb, proc.contrast, proc.contrastCenter );	
	vec3 sharp = _sharp3f( origin.rgb, sum.rgb, proc.sharpness );
	sum.rgb =	 mix( sum.rgb, sharp, proc.blurOrSharp );
	sum.rgb *=	 proc.intensity;	
	sum.rgb =	_invert3f( sum.rgb, proc.invert );
	sum.a = 1.0;
	return saturate ( sum );
}

vec4 blurLayerBuffer( vec2 uv, ProcessorParams proc )
{
	HINT_BRANCH
	if( proc.sharpness == 0.0 )
	{
		return texture2DAutoLod( tTempInputMap, uv, vec2(uOutputSizeInv.x, 0.0), vec2(0.0, uOutputSizeInv.y) );
	}

	vec4 sum = vec4(0.0,0.0,0.0,0.0);
	for( int i=0; i<uProcessorSampleCount; ++i )
	{
		vec4 tap = textureWithSamplerLod( tTempInputMap, uBufferSampler, uProcessorKernel[i].xy + uv, 0 );
		sum += uProcessorSampleWeight[i] * tap;
	}

	return sum;
}

#define blurInputRaw( id, uv, proc ) 	 									 					blurLayerBuffer( uv, proc )
#define blurInputGray( id, uv, proc )		decodeToGray(		uInputMapFormat##id,			blurLayerBuffer( uv, proc ) )
#define blurInputRGBA( id, uv, proc )		decodeBufferRGBA(	uInputMapFormat##id,			blurLayerBuffer( uv, proc ) )
#define blurInputVector( id, uv, proc )		decodeToVector( uInputScale##id, uInputBias##id,	blurLayerBuffer( uv, proc ) )

//NOTE: sampleInput____ is defined in layerinput.sh
#define processInputRaw( id, uv, proc )		processColor( sampleInputRaw( id, uv ),		blurInputRaw( id, uv, proc ),	 proc )
#define processInputGray( id, uv, proc )	processColor( sampleInputGray( id, uv ),	blurInputGray( id, uv, proc ),	 proc )
#define processInputRGBA( id, uv, proc )	processColor( sampleInputRGBA( id, uv ),	blurInputRGBA( id, uv, proc ),	 proc )
#define processInputVector( id, uv, proc )	processColor( sampleInputVector( id, uv ),	blurInputVector( id, uv, proc ), proc )

#endif
