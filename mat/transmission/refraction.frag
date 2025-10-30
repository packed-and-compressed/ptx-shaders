#include "data/shader/common/util.sh"

USE_TEXTURE2D(tRefractionBackground);

uniform mat4	uRefractionViewProjection;
uniform vec2	uRefractionPixelSize; // { 1/w, 1/h }
uniform vec2	uRefractionLodScaleBias; // { max lod, lod bias}
uniform float	uRefractionDither;

void	TransmissionRefraction( inout FragmentState s )
{
	float ior = rcp( s.eta );

	//find proper refraction direction
	vec3 d = refract( -s.vertexEye, s.normal, s.eta );

	//estimate ray distance. since we're not tracing a real ray,
	//we approximate the intersection based on mesh scale and IOR value
	float rayDistance = s.refractionThickness * max( ior-1.0, 0.0 );

	//march the ray out a bit, then project that point
	d = s.vertexPosition + d * rayDistance;
	vec4 proj = mulPoint( uRefractionViewProjection, d );
	vec2 c = proj.xy / proj.w;
	#ifdef RENDERTARGET_Y_DOWN
		c.y = -c.y;
	#endif
	c = 0.5*c + vec2(0.5,0.5);

	//sample the background
	float lod = uRefractionLodScaleBias.x - uRefractionLodScaleBias.x * (s.glossTransmission * s.glossTransmission)- uRefractionLodScaleBias.y;
	vec3 background = texture2DLod( tRefractionBackground, c, lod ).xyz;

	float radius = exp2(lod) * saturate(lod);
	vec2  psize  = uRefractionPixelSize * radius;
	
	//background blur samples
	vec2 K = vec2( 23.14069263277926, 2.665144142690225 );
	float rnd = fract( cos( dot(vec2(s.screenCoord),K) ) * 12345.6789 );
	float sampleTheta = (2.0 * 3.141593) * rnd * uRefractionDither;
	float sinTheta = sin(sampleTheta);
	float cosTheta = cos(sampleTheta);
	vec4 kern = vec4(cosTheta, sinTheta, -sinTheta, cosTheta) * psize.xyxy;

	if( radius > 0.0 )
	{
		#define ZERO vec4(0.0,0.0,0.0,0.0)
		background += texture2DLod( tRefractionBackground, c - (kern.xy - kern.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c - (kern.xy + ZERO.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c - (kern.xy + kern.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c + (ZERO.xy - kern.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c + (ZERO.xy + kern.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c + (kern.xy - kern.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c + (kern.xy + ZERO.zw), lod ).xyz;
		background += texture2DLod( tRefractionBackground, c + (kern.xy + kern.zw), lod ).xyz;
		background /= 9.0;
	}

	//refractionColor already includes Fresnel throughput ~ms
	//FIXME: remove s.refractionColor factor after full switch to V2 ~ms
	s.specularLight += s.refractionColor * s.transmissivity * background;
}

#define Transmission	TransmissionRefraction
#define TransmissionIsSpecular
