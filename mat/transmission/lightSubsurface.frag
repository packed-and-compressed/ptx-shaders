#include "data/shader/mat/state.frag"
#include "data/shader/mat/fresnel.frag"

USE_TEXTURE2D(tScatterBuffer);

void	TransmissionScatterEnv( inout FragmentState s )
{	
	vec3 scatterLight = texture2D( tScatterBuffer, s.screenTexCoord ).rgb;

	//"fuzz", roughly matches ray traced version
	{
		float mx = saturate(1.0 - dot( s.normal, s.vertexEye ));
		mx *= mx; mx *= mx;
		vec3 fuzz = s.fuzz * mx;
		HINT_FLATTEN if( s.fuzzGlossMask )
		{ fuzz *= 1.0 - s.gloss; }
		scatterLight += fuzz * scatterLight;
	}
	
	s.diffuseLight += s.transmissivity * scatterLight;
}

#define	Transmission	TransmissionScatterEnv
