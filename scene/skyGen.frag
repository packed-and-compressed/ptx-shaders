uniform vec3	uCubeX, uCubeY, uCubeZ;

uniform vec3	uSunDirection;
uniform vec3	uSunSize; // { sunRadius, sunAARadius, 1/(sunAARadius-sunRadius) }
uniform float	uSunBright;
uniform float	uSunParametric;
uniform float	uSunTurbidityCoord;
uniform float	uTurbidityInterp;

uniform vec3	uTwilightFade;
uniform vec3	uGroundColorNear, uGroundColorFar;
uniform vec2	uPostWhiteBalance;
uniform float	uPostSaturation;

uniform float	uRadianceX[6*9*2];
uniform float	uRadianceY[6*9*2];
uniform float	uRadianceZ[6*9*2];

uniform float	uRadianceMeanX[6*2];
uniform float	uRadianceMeanY[6*2];
uniform float	uRadianceMeanZ[6*2];

USE_TEXTURE2D(tSunLUT);

struct BezierCurve
{
	float control[6];
};

float	bezier( BezierCurve c, float t )
{
	float t2 = t * t;
	float t3 = t2 * t;
	float t4 = t3 * t;
	float t5 = t4 * t;
	
	float t_inv = 1.0 - t;
	float t_inv2 = t_inv * t_inv;
	float t_inv3 = t_inv2 * t_inv;
	float t_inv4 = t_inv3 * t_inv;
	float t_inv5 = t_inv4 * t_inv;
	
	return
		c.control[0] *             t_inv5 +
		c.control[1] *  5.0 * t  * t_inv4 +
		c.control[2] * 10.0 * t2 * t_inv3 +
		c.control[3] * 10.0 * t3 * t_inv2 +
		c.control[4] *  5.0 * t4 * t_inv  +
		c.control[5] *        t5;
}

BezierCurve	getRadianceCurve( uint coefficient, uint channel, uint set )
{
	uint base = set*6*9 + coefficient;

	BezierCurve c;
	if( channel == 0 )
	{
		for( uint i=0; i<6; ++i )
		{ c.control[i] = uRadianceX[base + 9*i]; }
	}
	else if( channel == 1 )
	{
		for( uint i=0; i<6; ++i )
		{ c.control[i] = uRadianceY[base + 9*i]; }
	}
	else if( channel == 2 )
	{
		for( uint i=0; i<6; ++i )
		{ c.control[i] = uRadianceZ[base + 9*i]; }
	}
	return c;
}

BezierCurve	getMeanRadianceCurve( uint channel, uint set )
{
	uint base = set*6;

	BezierCurve c;
	if( channel == 0 )
	{
		for( uint i=0; i<6; ++i )
		{ c.control[i] = uRadianceMeanX[base + i]; }
	}
	else if( channel == 1 )
	{
		for( uint i=0; i<6; ++i )
		{ c.control[i] = uRadianceMeanY[base + i]; }
	}
	else if( channel == 2 )
	{
		for( uint i=0; i<6; ++i )
		{ c.control[i] = uRadianceMeanZ[base + i]; }
	}
	return c;
}

struct Coefficients
{
	float A, B, C, D, E, F, G, H, I;
};

Coefficients	getCoeffecients( uint channel, uint set )
{
	Coefficients c;
	c.A = bezier( getRadianceCurve(0,channel,set), uSunParametric );
	c.B = bezier( getRadianceCurve(1,channel,set), uSunParametric );
	c.C = bezier( getRadianceCurve(2,channel,set), uSunParametric );
	c.D = bezier( getRadianceCurve(3,channel,set), uSunParametric );
	c.E = bezier( getRadianceCurve(4,channel,set), uSunParametric );
	c.F = bezier( getRadianceCurve(5,channel,set), uSunParametric );
	c.G = bezier( getRadianceCurve(6,channel,set), uSunParametric );
	c.H = bezier( getRadianceCurve(8,channel,set), uSunParametric );
	c.I = bezier( getRadianceCurve(7,channel,set), uSunParametric );
	return c;
}

float	F( float cosTheta, float cosGamma, float gamma, Coefficients c )
{
	float chi = (1.0 + cosGamma*cosGamma) / pow( 1.0 + c.H*c.H - 2.0*c.H*cosGamma, 1.5 );

	return	(1.0 + c.A * exp(c.B / (cosTheta + .01))) *
			(c.C + c.D * exp(c.E * gamma) + c.F * cosGamma*cosGamma + c.G * chi + c.I * sqrt(cosTheta) );
}

vec3	sampleSky( float cosTheta, float cosGamma, float gamma, uint set )
{
	vec3 radiance;
	radiance.x = F( cosTheta, cosGamma, gamma, getCoeffecients(0,set) );
	radiance.y = F( cosTheta, cosGamma, gamma, getCoeffecients(1,set) );
	radiance.z = F( cosTheta, cosGamma, gamma, getCoeffecients(2,set) );

	vec3 meanRadiance;
	meanRadiance.x = bezier( getMeanRadianceCurve(0,set), uSunParametric );
	meanRadiance.y = bezier( getMeanRadianceCurve(1,set), uSunParametric );
	meanRadiance.z = bezier( getMeanRadianceCurve(2,set), uSunParametric );

	return radiance * meanRadiance;
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 dir = normalize( uCubeX * fCoord.x + uCubeY * fCoord.y - uCubeZ );
	
	vec3 radiance;

	HINT_BRANCH
	if( dir.y <= 0.0 )
	{
		//ground plane only, skip the sky calculation
		radiance = mix( uGroundColorFar, uGroundColorNear, pow(-dir.y,0.3) );
		radiance *= 0.1 + 0.9*saturate(uSunDirection.y);
	}
	else
	{
		//gamma: angle between view and sun
		float cosGamma = saturate( dot( dir, uSunDirection ) );
		float gamma = acos( cosGamma );

		//theta: view zenith angle
		float cosTheta = dir.y;
		float sinTheta = sqrt( 1.0 - dir.y*dir.y );

		//sample sky radiance (CIE-XYZ)
		{
			//interpolate between two sets of sky params, for smooth turbidity/haze value
			vec3 radA = sampleSky( cosTheta, cosGamma, gamma, 0 );
			vec3 radB = sampleSky( cosTheta, cosGamma, gamma, 1 );
			radiance = mix( radA, radB, uTurbidityInterp );
		}

		//simple sun render
		if( gamma < uSunSize.y )
		{
			vec3 sun = texture2DLod( tSunLUT, vec2( uSunTurbidityCoord, cosTheta ), 0.0 ).xyz;
			sun *= 1.0 - saturate( (gamma-uSunSize.x) * uSunSize.z );
			radiance += uSunBright * sun;
		}

		//convert radiance to linear RGB
		radiance =	radiance.x * vec3(3.240970,  -.969244, 0.055630) +
					radiance.y * vec3(-1.537383, 1.875968,-0.203977) +
					radiance.z * vec3(-0.498611, 0.041555, 1.056972);

		//expose
		radiance *= 0.03;
	}

	//RGB twilight fade
	radiance *= uTwilightFade;

	//post effect: white balance
	{
		// Get the CIE xy chromaticity of the target white point.
		// This is D65 shifted by our temperature param along the planckian locus,
		// and a "tint" factor along the y axis.
		float chromShift = .05 * 1.667;
		float x = 0.31271 - uPostWhiteBalance.x * (uPostWhiteBalance.x < 0 ? 2*chromShift : chromShift);
		float standardIlluminantY = 2.87 * x - 3.0 * x * x - 0.27509507;
		float y = standardIlluminantY + uPostWhiteBalance.y * chromShift;

		//target white point as LMS
		float Y = 1.0;
		float X = Y * x / y;
		float Z = Y * (1.0 - x - y) / y;
		vec3 target = vec3(
			0.7328 * X + 0.4296 * Y - 0.1624 * Z,
			-0.7036 * X + 1.6975 * Y + 0.0061 * Z,
			0.0030 * X + 0.0136 * Y + 0.9834 * Z	);

		//convert RGB radiance to LMS
		vec3 lms = vec3(
			3.90405e-1 * radiance.x + 5.49941e-1 * radiance.y + 8.92632e-3 * radiance.z,
			7.08416e-2 * radiance.x + 9.63172e-1 * radiance.y + 1.35775e-3 * radiance.z,
			2.31082e-2 * radiance.x + 1.28021e-1 * radiance.y + 9.36245e-1 * radiance.z
		);

		//balance factor is ratio of D65 reference to target white points
		vec3 d65 = vec3( 0.949237, 1.03542, 1.08728 );
		lms *= float3(d65.x / target.x, d65.y / target.y, d65.z / target.z);

		//convert LMS radiance back to RGB
		radiance = vec3(
			 2.85847e+0 * lms.x - 1.62879e+0 * lms.y - 2.48910e-2 * lms.z,
			-2.10182e-1 * lms.x + 1.15820e+0 * lms.y + 3.24281e-4 * lms.z,
			-4.18120e-2 * lms.x - 1.18169e-1 * lms.y + 1.06867e+0 * lms.z
		);
	}
	
	//post effect: saturation
	float lum = dot( radiance, vec3(0.299,0.587,0.114) );
	radiance = mix( vec3(lum,lum,lum), radiance, uPostSaturation );

	OUT_COLOR0.xyz = radiance;
	OUT_COLOR0.w = 1.0;
}
