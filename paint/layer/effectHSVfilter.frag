#include "effect.frag"
#include "gaussian.sh"


uniform float	uHueCycle;
uniform float	uSaturation;
uniform float	uValue;
uniform float	uContrast;
uniform float	uContrastCenter;


USE_LAYER_BUFFER2D( tHSVFilter );

vec3 EffectHSVToRGB( vec3 hsv )
{
	vec3 rgb = vec3(0,0,0);
	float h = hsv.x;
	h = h > 360.f ? 360.f : h;
	h = h < 0.f ? 0.f : h;
	float s = hsv.y;
	float v = hsv.z;

	float chroma = v * s;
	float hh = h / 60.f;
	float x = chroma * ( 1.f - abs( fmod(hh,2.f) - 1.f ) );

	if( hh < 1.f )		{ rgb.x = chroma;	rgb.y = x;			rgb.z = 0.f; }
	else if( hh < 2.f )	{ rgb.x = x;		rgb.y = chroma;	rgb.z = 0.f; }
	else if( hh < 3.f )	{ rgb.x = 0.f;		rgb.y = chroma;	rgb.z = x; }
	else if( hh < 4.f )	{ rgb.x = 0.f;		rgb.y = x;			rgb.z = chroma; }
	else if( hh < 5.f )	{ rgb.x = x;		rgb.y = 0.f;		rgb.z = chroma; }
	else				{ rgb.x = chroma;	rgb.y = 0.f;		rgb.z = x; }

	float mn = v - chroma;
	rgb.x += mn;
	rgb.y += mn;
	rgb.z += mn;

	return rgb;
}

vec3 EffectRGBToHSV( vec3 rgb )
{
	vec3 hsv = vec3(0,0,0);
	float r = rgb.x;
	float g = rgb.y;
	float b = rgb.z;

	float mn = min( min( r, g ), b );
	float mx = max( max( r, g ), b );
	float chroma = mx - mn;

	float h=0.f, s=0.f, v=mx;
	if( chroma != 0.f )
	{
		if( r == mx )
		{
			h = (g - b) / chroma;
			if( h < 0.f )
			{ h += 6.f; }
		}
		else if( g == mx )
		{ h = (b - r) / chroma + 2.f; }
		else
		{ h = (r - g) / chroma + 4.f; }
		h *= 60.f;
		s = chroma / mx;
	}

	hsv.x = h;
	hsv.y = s;
	hsv.z = v;

	return hsv;
}

vec4 getNormalSample( vec2 uv )
{
	vec4 c = sampleBackingBufferLod( tHSVFilter, uv, 0 );
	
	//scale bias & normalize
	c.rgb = c.rgb * 2.0 - vec3(1.0,1.0,1.0);
	vec3 center = vec3(0.0,0.0,1.0);
	c.rgb = (c.rgb - center)*uContrast + center;
	c.rgb = normalize( c.rgb );
	c.rgb = 0.5*c.rgb + vec3(0.5,0.5,0.5);

	return c;
}

vec4 getSample(vec2 uv)
{
	vec4 sample = sampleBackingBufferRawLod( tHSVFilter, uv, 0 );
	
	sample.x = saturate( ((sample.x - uContrastCenter) * uContrast) + uContrastCenter );
	sample.y = saturate( ((sample.y - uContrastCenter) * uContrast) + uContrastCenter );
	sample.z = saturate( ((sample.z - uContrastCenter) * uContrast) + uContrastCenter );
	
	sample = formatBackingColor( uBackingFormat, sample );

	sample.w = 1;

	vec3 hsv = EffectRGBToHSV( sample.xyz );
	hsv.x += uHueCycle * 360;
	if( hsv.x > 360 ) hsv.x -= 360;
	sample.xyz = EffectHSVToRGB( hsv );

	//saturation from post.frag
	float gray = dot( sample.xyz, vec3(0.3,0.59,0.11) );
	sample.xyz = mix( vec3(gray,gray,gray), sample.xyz, uSaturation );

	sample.xyz *= uValue;

	return sample;
}

vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.bufferCoord;

	if( uChannel == CHANNEL_NORMAL )
	{ state.result.rgb = getNormalSample( sampleCoord ).rgb; }
	else
	{ state.result.rgb = getSample( sampleCoord ).rgb; }
	
	return state.result;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }

