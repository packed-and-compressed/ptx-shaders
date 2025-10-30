USE_TEXTURECUBE(tSkyTexture);
uniform float	uSkyBrightness;

BEGIN_PARAMS
	INPUT0(vec3,skyBoxCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 s = textureCube( tSkyTexture, skyBoxCoord ).rgb;
	s *= uSkyBrightness;
	OUT_COLOR0.xyz = s;
	OUT_COLOR0.w = 0.0;
}
