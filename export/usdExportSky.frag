#ifdef NO_CUBE
USE_TEXTURE2D(tTexture);
#else
USE_TEXTURECUBE(tTexture);
#endif
uniform float uBrightness;
uniform float uContrast;
uniform float uBias;
uniform float uSaturation;

#define	PI	3.14159265359


BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 tc = fTexCoord;
	float pi = 3.14159265;
	float theta = (2.0*pi)*tc.x - pi;
	float phi = pi*tc.y - (0.5*pi);
	vec3 dir;
	sincos(theta,dir.z,dir.x);
	float cosPhi;
	sincos( phi, dir.y, cosPhi );
	dir.xz *= cosPhi;
	
#ifdef NO_CUBE
	vec4 c = texture2D( tTexture, tc );
#else
	vec4 c = textureCube( tTexture, dir );
#endif	
	vec4 contrast = vec4(1.0, 1.0, 1.0, uContrast);
	vec4 bias4 = vec4(1.0, 1.0, 1.0, uBias);
	vec4 brightness = vec4(1.0, 1.0, 1.0, uBrightness); 
	vec3 scale = contrast.xyz * contrast.w;
	vec3 bias = bias4.xyz * bias4.w;
	bias = -bias*scale + bias;
	vec3 bright = brightness.xyz * brightness.w;
	bias = bias * bright;
	scale = scale * bright;
	vec3 sat = vec3(uSaturation, uSaturation, uSaturation);

	//saturation
	float gray = dot( c.xyz, vec3(0.3,0.59,0.11) );
	c.xyz = mix( vec3(gray,gray,gray), c.xyz, sat );

	//contrast
	c.xyz = c.xyz * scale + bias;
	c.a = 1.0;

	OUT_COLOR0 = c;
}
