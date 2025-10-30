#ifndef MSET_UNPROJECT_H
#define MSET_UNPROJECT_H

uniform int		uPerspective;
uniform vec4	uUnproject;

vec3 unprojectViewDepthToViewPos( const vec2 screenSpaceCoord, const float eyeZ )
{
	vec3 p;
	// depth is in view space
	p.z = eyeZ;
	// depth projection for perspective
	const float z = uPerspective > 0 ? eyeZ : 1.0f;
	// screen coord [0, 1] to viewspace position
	p.xy = z * ( screenSpaceCoord * uUnproject.xy + uUnproject.zw );
	return p;
}

#endif
