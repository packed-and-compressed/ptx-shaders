#include "data/shader/mat/state.frag"
#include "data/shader/mat/state.comp"

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

#define ReflectionPrecomputeSecondary(p,m,s)	ReflectionNewtonsRingsPrecompute(p.reflectionSecondary,m,s)
#define ReflectionPrecomputeMergeSecondary		ReflectionNewtonsRingsPrecomputeMerge

#ifdef	ReflectionEvaluate
void	ReflectionNewtonsRingsEvaluate( in PathState path, inout FragmentState fs, inout SampleState ss )
{
	//Just wrapping the base ReflectionEvaluate,
	//so we can do our dirty deed to the bsdf. -jdr
	ReflectionEvaluate(path,fs,ss);

	if( isReflection(ss) )
	{
		//find a multiple of the wavelenth at peak constructive interference;
		//use it to look into our spectrum. Given by:
		//	k * l = thickness / cos(theta)
		//where k is an integer, l is a given light wavelength,
		//and theta is the angle of incidence. -jdr
		float cosTheta = ss.NdotV;
		float wavelengthMult = fs.newtonsRingsThickness / cosTheta;
		vec3  interference = texture2D( tNewtonsRingsInterference, vec2(wavelengthMult,0.0) ).xyz;
		
		//a fresnel-like effect accompanies this
		float fade = saturate( 1.0 - cosTheta );
		fade *= fade; fade *= fade;
		fade = 1.0 - fade*fade;
		
		//blend based on artist specified intensity
		float intensity    = fs.newtonsRingsIntensity * fade;
		vec3  newtonsRings = mix( vec3(1.0,1.0,1.0), interference, intensity );
		ss.bsdf *= newtonsRings;
	}
}
#undef  ReflectionEvaluate
#define ReflectionEvaluate	ReflectionNewtonsRingsEvaluate
#endif //ReflectionEvaluate
