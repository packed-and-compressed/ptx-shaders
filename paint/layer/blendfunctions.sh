#ifndef BLEND_FUNCTIONS_SH
#define BLEND_FUNCTIONS_SH

vec4	_stdMix( vec4 front, vec4 back, float fade )
{
	front.a = front.a * fade;
	front.rgb *= front.a;
	back.rgb *= back.a;
	front = (back * (1.0-front.a)) + front;	
	front.rgb /= max(0.0001, front.a);	
	return front;
}

//for blend modes that do not affect alpha
vec4	_tintMix( vec4 result, vec4 back, float fadeTimesFrontAlpha )
{
	result.rgb = mix(back.rgb, result.rgb, fadeTimesFrontAlpha);
	result.a = back.a;
	return result;
}

vec4	blendReplace( vec4 front, vec4 back, float fade )
{ 
	return front; 
}

vec4	blendFadeReplace( vec4 front, vec4 back, float fade )
{
	back.rgb *= back.a;
	front.rgb *= front.a;
	front = mix( back, front, fade );
	front.rgb /= max(0.0001, front.a); //mixing RGBA so premultiplied alpha
	return front;
}

vec4	blendVectorAlpha( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	front.rgb = 2.0 * front.rgb - ONE;
	back.rgb = 2.0 * back.rgb - ONE;

	front = _stdMix( front, back, fade );
	front.rgb = normalize( front.rgb );
	front.rgb = 0.5 * front.rgb + HALF;	
	return front;
}

vec4	blendVectorDetail( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	front.xyz = 2.0 * front.rgb - ONE;
	back.xyz  = 2.0 * back.rgb - ONE;

	vec4 origBack = back;
	
	//Blend back against 0,0,1 vector, mix( vec3(0,0,1), back.rgb, back.a );
	back.rgb = back.rgb * back.a;
	back.b += 1.0 - back.a;
		
	front.xyz = 
		( back.xyz - vec3(0.0, 0.0, 1.0)) +
		(front.xyz - vec3(0.0, 0.0, 1.0)) * front.a +
		vec3(0.0, 0.0, 1.0);

	front = _stdMix( front, origBack, fade );
	front.xyz = normalize( front.xyz );

	front.rgb = 0.5 * front.xyz + HALF;
	return front;
}

vec4	blendDirectionDetail( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	front.xyz = 2.0 * front.rgb - ONE;
	back.xyz  = 2.0 * back.rgb - ONE;

	vec4 origBack = back;
	
	//Blend back against 0,0,1 vector, mix( vec3(0,0,1), back.rgb, back.a );
	back.rgb = back.rgb * back.a;
	back.b += 1.0 - back.a;
		
	front.xyz = 
		( back.xyz - vec3(0.0, 1.0, 0.0)) +
		(front.xyz - vec3(0.0, 1.0, 0.0)) * front.a +
		vec3(0.0, 1.0, 0.0);

	front = _stdMix( front, origBack, fade );
	front.xyz = normalize( front.xyz );

	front.rgb = 0.5 * front.xyz + HALF;
	return front;
}

vec4	blendAlpha( vec4 front, vec4 back, float fade )
{
	return _stdMix( front, back, fade );
}

vec4	blendAdd( vec4 front, vec4 back, float fade )
{
	return _tintMix(saturate(front+back), back, fade*front.a);
}

vec4	blendAddNoSaturate( vec4 front, vec4 back, float fade )
{
	return _tintMix(front+back, back, fade*front.a);
}

vec4	blendMultiply( vec4 front, vec4 back, float fade )
{
	return _tintMix(front*back, back, fade*front.a);
}

vec4	blendOverlay( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	
	vec4 result = front;
	front.rgb = saturate(front.rgb);
	back.rgb = saturate(back.rgb);
	
	result.rgb = mix(
		saturate( 2.0 * back.rgb * front.rgb ),
		saturate( ONE - ( ONE - 2.0 * ( back.rgb - HALF ) ) * (ONE - front.rgb) ),
		vec3( greaterThan( back.rgb, HALF ) )
    );
    return _tintMix(result, back, front.a * fade);
}

vec4	blendScreen( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	vec4 result = front;
	front.rgb = saturate(front.rgb);
	back.rgb = saturate(back.rgb);
	result.rgb = ONE - (ONE - back.rgb) * (ONE - front.rgb);
	return _tintMix(result, back, front.a * fade);
}

vec4	blendLighten( vec4 front, vec4 back, float fade )
{
	return _tintMix(max(front, back), back, front.a * fade);
}

vec4	blendDarken( vec4 front, vec4 back, float fade )
{
	return _tintMix(min(front, back), back, front.a * fade);
}

vec4	blendColorDodge( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	vec4 result = front;
	front.rgb = saturate(front.rgb);
	vec3 eps = vec3(0.0001, 0.0001, 0.0001);

	result.rgb = min( ONE, back.rgb / max( eps, ONE - front.rgb ) );	
	return _tintMix(result, back, front.a * fade);
}

vec4	blendColorBurn( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	vec4 result = front;
	front.rgb = saturate(front.rgb);
	back.rgb = saturate(back.rgb);

	vec3 eps = vec3(0.0001, 0.0001, 0.0001);
	result.rgb = saturate( (ONE - (ONE - back.rgb) / max(eps, front.rgb) ) );
	return _tintMix(result, back, front.a * fade);
}

vec4	blendLinearBurn( vec4 front, vec4 back, float fade )
{
	const vec3	ONE = vec3(1.0,1.0,1.0);
	const vec3	HALF = vec3(0.5,0.5,0.5);
	vec4 result = front;
	front.rgb = saturate(front.rgb);
	back.rgb = saturate(back.rgb);

	result.rgb = saturate( back.rgb + front.rgb - ONE );
	return _tintMix(result, back, front.a * fade);
}

#endif
