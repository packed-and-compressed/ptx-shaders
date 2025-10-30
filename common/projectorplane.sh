#ifndef PROJECTORPLANE_SH
#define PROJECTORPLANE_SH

struct ProjectorPlane
{
	vec3 U;
	vec3 V;
};

ProjectorPlane newProjectorPlane()
{
	ProjectorPlane plane;
	
	plane.U = vec3( 0, 0, 0 );
	plane.V = vec3( 0, 0, 0 );
	
	return plane;
}

#endif
