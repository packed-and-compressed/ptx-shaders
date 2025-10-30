#ifndef MSET_DIFFERENTIAL_SH
#define MSET_DIFFERENTIAL_SH

#include "util.sh"

struct diff2
{
    vec2 dx, dy;
};

struct diff3
{
    vec3 dx, dy;
};

//construct differential
diff2 makeDifferential( vec2 dx, vec2 dy )
{
    diff2 d;
    d.dx = dx;
    d.dy = dy;
    return d;
}
diff3 makeDifferential( vec3 dx, vec3 dy )
{
    diff3 d;
    d.dx = dx;
    d.dy = dy;
    return d;
}

//construct screen-space differential
#ifndef SHADER_COMPUTE
diff2 makeScreenDifferential( vec2 v )
{
    diff2 d;
    d.dx = ddx(v);
    d.dy = ddy(v);
    return d;
}
diff3 makeScreenDifferential( vec3 v )
{
    diff3 d;
    d.dx = ddx(v);
    d.dy = ddy(v);
    return d;
}
#endif

//compact differential representation (average length)
float compactDifferential( diff2 d )
{
	return 0.5 * ( length(d.dx) + length(d.dy) );
}
float compactDifferential( diff3 d )
{
	return 0.5 * ( length(d.dx) + length(d.dy) );
}

//rotate partial derivatives using components of rot(cos(angle), sin(angle))
diff2 rotateDifferential( vec2 rot, diff2 d )
{
    diff2 r;
    r.dx = vec2( d.dx.x * rot.x - d.dx.y * rot.y,
			     d.dx.x * rot.y + d.dx.y * rot.x );
    r.dy = vec2( d.dy.x * rot.x - d.dy.y * rot.y,
			     d.dy.x * rot.y + d.dy.y * rot.x );
    return r;
}

//scale partial derivatives by components of s
diff2 scaleDifferential( vec2 s, diff2 d )
{
    diff2 r;
    r.dx = d.dx * s.x;
    r.dy = d.dy * s.y;
    return r;
}
diff3 scaleDifferential( vec2 s, diff3 d )
{
    diff3 r;
    r.dx = d.dx * s.x;
    r.dy = d.dy * s.y;
    return r;
}

//multiply differential by a vector
diff2 mulDifferential( vec2 v, diff2 d )
{
    diff2 r;
    r.dx = d.dx * v;
    r.dy = d.dy * v;
    return r;
}
diff3 mulDifferential( vec3 v, diff3 d )
{
    diff3 r;
    r.dx = d.dx * v;
    r.dy = d.dy * v;
    return r;
}

//transform differential by multiplying partial derivatives by a matrix
diff3 mulDifferential( mat4 m, diff3 d )
{
    diff3 r;
    r.dx = mulVec( m, d.dx );
    r.dy = mulVec( m, d.dy );
    return r;
}
diff3 mulDifferential( mat3x4 m, diff3 d )
{
    diff3 r;
    r.dx = mulVec( m, d.dx );
    r.dy = mulVec( m, d.dy );
    return r;
}

//construct barycentric differential
diff2 makeBarycentricDifferential( diff3 dP, vec3 edge01, vec3 edge02, vec3 Ng )
{
	const vec3 nU = cross(edge02, Ng);
	const vec3 nV = cross(edge01, Ng);
	const vec3 lU = nU * rcp(dot(nU, edge01));
	const vec3 lV = nV * rcp(dot(nV, edge02));

    diff2 dBarycentric;
	// du/dx, dv/dx
	dBarycentric.dx = vec2(dot(lU, dP.dx), dot(lV, dP.dx));
	// du/dy, dv/dy
	dBarycentric.dy = vec2(dot(lU, dP.dy), dot(lV, dP.dy));
    return dBarycentric;
}

//barycentric differential interpolation
diff2 interpolateDifferential( diff2 dBarycentric, vec2 v0, vec2 v1, vec2 v2 )
{
    const vec2 delta01 = v1 - v0;
    const vec2 delta02 = v2 - v0;

    diff2 d;
    d.dx = dBarycentric.dx.x * delta01 + dBarycentric.dx.y * delta02;
    d.dy = dBarycentric.dy.x * delta01 + dBarycentric.dy.y * delta02;
    return d;
}
diff3 interpolateDifferential( diff2 dBarycentric, vec3 v0, vec3 v1, vec3 v2 )
{
    const vec3 delta01 = v1 - v0;
    const vec3 delta02 = v2 - v0;

    diff3 d;
    d.dx = dBarycentric.dx.x * delta01 + dBarycentric.dx.y * delta02;
    d.dy = dBarycentric.dy.x * delta01 + dBarycentric.dy.y * delta02;
    return d;
}

vec2 packTextureGrads( diff2 dUV )
{
    uint2 p;
    p.x = (f32tof16(dUV.dx.x)<<16) | f32tof16(dUV.dx.y);
    p.y = (f32tof16(dUV.dy.x)<<16) | f32tof16(dUV.dy.y);
    return asfloat(p);
}

vec2 unpackTextureGrad( float grad )
{
    uint p = asuint(grad);
    return vec2( f16tof32(p>>16), f16tof32(p) );
}

vec2 scaleTextureGrads( vec2 s, vec2 grads )
{
    diff2 dUV;
    dUV.dx = unpackTextureGrad(grads.x) * s.x;
    dUV.dy = unpackTextureGrad(grads.y) * s.y;
    return packTextureGrads( dUV ); 
}

vec2 rotateTextureGrads( vec2 rot, vec2 grads )
{
    diff2 dUV;
    dUV.dx = unpackTextureGrad(grads.x);
    dUV.dy = unpackTextureGrad(grads.y);
    return packTextureGrads( rotateDifferential( rot, dUV ) );
}

vec2 transformTextureGrads( vec2 s, vec2 rot, vec2 grads )
{
    diff2 dUV;
    dUV.dx = unpackTextureGrad(grads.x);
    dUV.dy = unpackTextureGrad(grads.y);
    return packTextureGrads( scaleDifferential( s, rotateDifferential( rot, dUV ) ) );
}

#endif