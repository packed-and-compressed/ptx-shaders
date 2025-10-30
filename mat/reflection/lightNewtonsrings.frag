#include "data/shader/mat/state.frag"

USE_TEXTURE2D(tNewtonsRingsInterference);

void	ReflectionNewtonsRingsPrecompute( in ReflectionNewtonsRingsParams p, inout MaterialState m, in FragmentState s )
{
	//thickness is mask over value
	float thickness = textureMaterial( p.thicknessTexture, m.vertexTexCoord, 1.0 );
	m.newtonsRingsThickness = thickness * p.thickness.x + p.thickness.y;
    m.newtonsRingsIntensity = p.intensity;
}

void	ReflectionNewtonsRingsPrecomputeMerge( in MaterialState m, inout FragmentState s )
{
    s.newtonsRingsThickness = m.newtonsRingsThickness;
    s.newtonsRingsIntensity = m.newtonsRingsIntensity;
}

void	ReflectionNewtonsRingsEnv( inout FragmentState s )
{
	//find a multiple of the wavelenth at peak constructive interference;
	//use it to look into our spectrum. Given by:
	//	k * l = thickness / cos(theta)
	//where k is an integer, l is a given light wavelength,
	//and theta is the angle of incidence. -jdr
	float cosTheta = dot( s.vertexEye, s.normal );
	float wavelengthMult = s.newtonsRingsThickness / cosTheta;
	vec3 interference = texture2D( tNewtonsRingsInterference, vec2(wavelengthMult,0.0) ).xyz;

	//a fresnel-like effect accompanies this
	float fade = 1.0 - cosTheta;
	fade *= fade; fade *= fade;
	fade = 1.0 - fade*fade;

	//blend based on artist specified intensity
	interference = mix( vec3(1.0,1.0,1.0), interference, s.newtonsRingsIntensity * fade );
    s.specularLight *= interference;
}

#define ReflectionPrecomputeSecondary(p,m,s)	ReflectionNewtonsRingsPrecompute(p.reflectionSecondary,m,s)
#define ReflectionPrecomputeMergeSecondary		ReflectionNewtonsRingsPrecomputeMerge
#define	ReflectionEnvSecondary          		ReflectionNewtonsRingsEnv
