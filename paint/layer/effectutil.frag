




vec2 rotate2d(float x, float y, float degrees)
{
	float c = cos(degrees);
	float s = sin(degrees);
	float rx = (x * c) - (y * s);
	float ry = (x * s) + (y * c);
	return vec2(rx, ry);
}

vec3 rotateAroundOrigin(vec3 pxyz, float rotx, float roty, float rotz)
{
	float d2r = 3.14159265359f / 180;

	float nx = pxyz.x;
	float ny = pxyz.y;
	float nz = pxyz.z;

	vec2 newXY = rotate2d(nx, ny, rotz*d2r);
	nx = newXY.x;
	ny = newXY.y;

	vec2 newYZ = rotate2d(ny, nz, rotx*d2r);
	ny = newYZ.x;
	nz = newYZ.y;

	vec2 newZX = rotate2d(nz, nx, roty*d2r);
	nz = newZX.x;
	nx = newZX.y;
	return vec3(nx, ny, nz);
}

mat4 generateMatrix(float rotx, float roty, float rotz)
{
    vec3 vx = vec3(1,0,0);
    vec3 vy = vec3(0,1,0);
    vec3 vz = vec3(0,0,1);

	vx = rotateAroundOrigin(vx, rotx, roty, rotz);
	vy = rotateAroundOrigin(vy, rotx, roty, rotz);
	vz = rotateAroundOrigin(vz, rotx, roty, rotz);

    return mat4(
		vx.x, vy.x, vz.x, 0,
		vx.y, vy.y, vz.y, 0,
		vx.z, vy.z, vz.z, 0,
		0, 0, 0, 1);
}


