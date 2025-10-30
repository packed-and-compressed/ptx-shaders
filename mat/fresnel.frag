#ifndef MSET_FRESNEL_FRAG
#define MSET_FRESNEL_FRAG

float fresnelSchlick( float cosTheta )
{
	float f = saturate( 1.0 - cosTheta );
	float f2 = f*f; f *= f2*f2; //f=f^5
	return f;
}

float fresnelSchlick( float F0, float Fintensity, float cosTheta )
{
	float F = fresnelSchlick( cosTheta );
	return mix( F0, 1.0, F * Fintensity );
}

vec3 fresnelSchlick( vec3 F0, vec3 Fintensity, float cosTheta )
{
	float F = fresnelSchlick( cosTheta );
	return mix( F0, vec3(1.0, 1.0, 1.0), F * Fintensity );
}

vec3 fresnelSchlick( vec3 F0, vec3 Fintensity, float cosThetaI, float eta )
{
	float cosTheta = abs( cosThetaI );
	HINT_FLATTEN if( cosThetaI < 0.0 )
	{
		//incident vector changes medium; invert eta
		eta = rcp( eta );
	}
	HINT_FLATTEN if( eta > 1.0 )
	{
		//going from more to less dense medium; handle potential TIR
		float sinThetaT2 = saturate( eta*eta * saturate( 1.0 - cosThetaI*cosThetaI ) );
		//use cosThetaT for Schlick approximation
		cosTheta = sqrt( 1.0 - sinThetaT2 );
	}
	return fresnelSchlick( F0, Fintensity, cosTheta );
}

float fresnelDielectric( float cosThetaI, float eta )
{
	HINT_FLATTEN if( cosThetaI < 0.0 )
	{
		//incident vector changes medium; invert eta
		eta = rcp( eta );
	}
	float sinThetaI = sqrt( saturate( 1.0 - cosThetaI*cosThetaI ) );
	float sinThetaT = eta * sinThetaI;

	if( sinThetaT >= 1.0 )
	{
		//total internal reflection
		return 1.0;
	}
	else
	{
		float cosThetaT = sqrt( 1.0 - sinThetaT*sinThetaT );
		float r1 = ( abs(cosThetaI) - eta * cosThetaT ) / ( abs(cosThetaI) + eta * cosThetaT );
		float r2 = ( abs(cosThetaI) * eta - cosThetaT ) / ( abs(cosThetaI) * eta + cosThetaT );
		return 0.5 * ( r1*r1 + r2*r2 );
	}
}

vec4 fresnelDielectric( float cosThetaI, float eta, vec3 reflectivity )
{
	vec4 F;
	F.w   = fresnelDielectric( cosThetaI, eta );
	F.rgb = reflectivity * F.w;
	return F;
}

// calculate the UVW texture coords of the specular reflection weighting
vec3 fresnelPreconvUVW( 
	const bool  frontFace,
	const float gloss, 
	float		NdotV, 
	const float eta )
{
	// the NdotV always seems to be positive, but this is not what we want here for fresnel
	// the ior is also flipped, so we need to re-flip it depending on whether we have flipped it
	NdotV *= ( frontFace ? 1.0 : -1.0 );
	const float roughness = saturate( 1.0 - gloss );
	// another mental gymnasium here, for front facing we have air ior / material ior
	// and for backfacing we are exiting a medium so we have material ior / air ior, so we have to
	// flip for the first case, and leave it alone in the second case
	const float ior = frontFace ? 1.0 / eta : eta;
	// there can be a little bit of bias at 1.0 ior, because in actual fact, at 1.0 ior we are still
	// allowing it to reflect even though physically 1.0 ior is not supposed to reflect, this is because
	// we are using the fresnel to interpolate from 0.04 (default of reflectivity) to 1.0, so we keep 
	// the reflectance behavior of 1.5 ior. To counter this problem we clamp our ior to a minimum of 1.05
	// and this allows a bit of transmission and reflection happening so we get some non zero weighting for 
	// either one of them. We can do this as this precomputed texture is just for weighting
	const float z = saturate( ( ior - 1.05 ) / ( 5.0 - 1.02 ) );
	return vec3( roughness, ( NdotV + 1.0 ) * 0.5, z );
}

#endif