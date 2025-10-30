#ifndef MSET_TANGENTSPACE_H
#define MSET_TANGENTSPACE_H

//////////////////////////////////////////////////////////////////////////
// Normal to slope conversion and vice versa, this normal has to be in 
// tangent space (a slope is defined w.r.t a normal in tangent space)

vec3 slopeToNormal(const half2 slope)
{
    return normalize( vec3( -slope.x, -slope.y, 1.0 ) );
}

vec3 slopeToNormal(const vec2 slope)
{
	return normalize( vec3( -slope.x, -slope.y, 1.0 ) );
}

vec2 normalToSlope(const vec3 H_t)
{
	return vec2( -H_t.x / H_t.z, -H_t.y / H_t.z );
}

//////////////////////////////////////////////////////////////////////////
// Tangent space / Shading space trigonometric helper functions

float cosTheta_t( const vec3 v )
{
	return v.z;
}

float cos2Theta_t( const vec3 v )
{
	return v.z * v.z;
}

float cos4Theta_t( const vec3 v )
{
	return cos2Theta_t(v) * cos2Theta_t(v);
}

float sin2Theta_t( const vec3 v )
{
	return 1.0 - cos2Theta_t(v);
}

float sinTheta_t( const vec3 v )
{
	// v is hopefully normalized here
	return sqrt(sin2Theta_t(v));
}

float tanTheta_t( const vec3 v )
{
	return cosTheta_t( v ) == 0.0 ? 0.0 : sinTheta_t(v) /  cosTheta_t(v);
}

float cosPhi_t( const vec3 v )
{
	return dot(v, v) == 0.0 ? 1.0 : clamp(v.x / sinTheta_t(v), -1.0, 1.0);
}

float cos2Phi_t( const vec3 v )
{
	const float c = cosPhi_t(v);
	return c * c;
}

float sinPhi_t( const vec3 v )
{
	return dot(v, v) == 0.0 ? 0.0 : clamp(v.y / sinTheta_t(v), -1.0, 1.0);
}

float sin2Phi_t( const vec3 v )
{
	return 1.0 - cos2Phi_t(v);
}

#endif
