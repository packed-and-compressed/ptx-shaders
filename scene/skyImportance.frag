USE_TEXTURECUBE(tSky);

#define PI	3.14159265

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float theta = PI * fCoord.x;
	float phi = 0.5 * PI * -fCoord.y;
	vec3 r = vec3( cos(theta)*cos(phi), sin(phi), sin(theta)*cos(phi) );
	
	vec3 color = textureCubeLod( tSky, r, 0.0 ).xyz;
	float luminance = dot( color, vec3(0.299, 0.587, 0.114) );
	luminance *= cos(phi);

	OUT_COLOR0 = vec4( luminance, 0.0, 0.0, 0.0 );
}
