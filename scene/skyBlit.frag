USE_TEXTURECUBE(tCube);

uniform vec3	uCubeX, uCubeY, uCubeZ;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec3 dir = normalize( uCubeX * fCoord.x + uCubeY * fCoord.y - uCubeZ );
	OUT_COLOR0 = textureCube( tCube, dir );
}
