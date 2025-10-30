#include "data/shader/mat/state.frag"
#include "data/shader/mat/other/lightParams.frag"

void	DiffusionShadowCatcherLight( inout FragmentState s, LightParams l )
{
	adjustAreaLightDiffuse( l, s.vertexPosition );
	
	vec3 shadow = l.shadow.rgb;
	float cosSpotAngle = l.spotParams.x;
	if( cosSpotAngle > 0.0 )
	{
		//spotlight correction
		vec3 lightZ = cross( l.axisX, l.axisY );
		float dp = saturate(dot( l.direction, lightZ ));
		float spotSharp = l.spotParams.y;
		float sin0 = sqrt(1.0 - dp*dp);
		float sin1 = sqrt(1.0 - cosSpotAngle*cosSpotAngle);
		float spotFade = saturate( spotSharp - spotSharp*sin0/sin1 );
		if( spotFade > 0.001 )
		{
			//'divide out' the spotlight border
			shadow = saturate( shadow/spotFade );
			shadow = mix( vec3(1.0,1.0,1.0), shadow, spotFade );
		}
		else
		{ shadow = vec3(1.0,1.0,1.0); }
	}

	//accumulate shadowed and unshadowed values
	float bright = l.attenuation * max(l.color.r, max(l.color.g, l.color.b));
	s.diffuseLight += shadow * bright;
	s.generic0.rgb += vec3( bright, bright, bright );
}
#define	Diffusion	DiffusionShadowCatcherLight
#define ShadowCatcher
