#ifndef MSET_RAYTRACING_RAYDIFFERENTIAL_COMP
#define MSET_RAYTRACING_RAYDIFFERENTIAL_COMP

#include "data/shader/common/differential.sh"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/mat/state.frag"

#if defined(MATERIAL_PASS_RT_PRIMARYHIT) || \
  ( defined(MATERIAL_PASS_RT_PRIMARYHIT_RASTER) && defined(SHADER_COMPUTE) ) || \
  ( defined(MATERIAL_PASS_HYBRID_LIGHT_SAMPLE) ) || \
  ( defined(MATERIAL_PASS_HYBRID_PRIMARYHIT) ) || \
  ( defined(MATERIAL_PASS_HYBRID_SPATIALHASHDEBUG) )
//view basis vectors for non-raster primary hit ray differential construction
uniform vec3 uRayDifferentialViewUp;
uniform vec3 uRayDifferentialViewRight;
#endif

struct RayDifferential
{
	diff3 dP;
	diff3 dD;
};

RayDifferential newRayDifferential()
{
	RayDifferential rd;
	rd.dP = makeDifferential( vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0) );
	rd.dD = makeDifferential( vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0) );
	return rd;
}

RayDifferential initializeRayDifferential( vec3 rayDirection, vec3 viewUp, vec3 viewRight )
{
	const float	dr = dot( rayDirection, viewRight );
	const float	du = dot( rayDirection, viewUp );
	const float dd = dot( rayDirection, rayDirection );
	const float divd = rcp( dd * sqrt( dd ) );

	RayDifferential rd;
	rd.dP.dx = vec3( 0.0, 0.0, 0.0 );
	rd.dP.dy = vec3( 0.0, 0.0, 0.0 );
	// calculate partial differential of ray direction in view space
	rd.dD.dx =  ( ( dd * viewRight ) - ( dr * rayDirection ) ) * divd;
	rd.dD.dy = -( ( dd * viewUp    ) - ( du * rayDirection ) ) * divd;
	return rd;
}

void propagateRayDifferential( vec3 rayDirection, float rayT, vec3 Ng, inout RayDifferential rd )
{
	rd.dP.dx = rd.dP.dx + rayT * rd.dD.dx;
	rd.dP.dy = rd.dP.dy + rayT * rd.dD.dy;
    
    const float invNdotD = rcpSafe( dot(Ng, rayDirection) );
	rd.dP.dx += rayDirection * -dot(rd.dP.dx, Ng) * invNdotD;
	rd.dP.dy += rayDirection * -dot(rd.dP.dy, Ng) * invNdotD;
}

RayDifferential reconstructRayDifferential( vec3 Ng, float rayT, float dPlen, float dDlen )
{
	const TangentBasis basis = createTangentBasis( Ng );
	const float scale = dPlen + rayT * dDlen;

	// basis.T == dx and basis.B == dy
	RayDifferential rd;
	rd.dP.dx = basis.T * scale;
	rd.dP.dy = basis.B * scale;
	rd.dD.dx = basis.T * dDlen;
	rd.dD.dy = basis.B * dDlen;
	return rd;
}

RayDifferential getRayDifferential( FragmentState fs )
{
	RayDifferential rd;
#if   defined(MATERIAL_PASS_RT_PRIMARYHIT) || \
	  defined(MATERIAL_PASS_RT_SECONDARYHIT) || \
	( defined(MATERIAL_PASS_RT_PRIMARYHIT_RASTER) && defined(SHADER_COMPUTE) ) || \
	( defined(MATERIAL_PASS_HYBRID_LIGHT_SAMPLE) ) || \
	( defined(MATERIAL_PASS_HYBRID_PRIMARYHIT) ) || \
	( defined(MATERIAL_PASS_HYBRID_INDIRECT) ) || \
	( defined(MATERIAL_PASS_HYBRID_SPATIALHASHDEBUG) )
	rd = reconstructRayDifferential( fs.geometricNormal, fs.vertexEyeDistance, fs.dP, fs.dD );
#else
	rd.dP = makeScreenDifferential( fs.vertexPosition );
	rd.dD = makeScreenDifferential( -fs.vertexEye );
#endif
	return rd;
}

RayDifferential getRayDifferentialPrecise( FragmentState fs )
{
	RayDifferential rd;
#if		defined(MATERIAL_PASS_RT_PRIMARYHIT) || \
	  ( defined(MATERIAL_PASS_RT_PRIMARYHIT_RASTER) && defined(SHADER_COMPUTE) ) || \
	  ( defined(MATERIAL_PASS_HYBRID_LIGHT_SAMPLE) ) || \
	  ( defined(MATERIAL_PASS_HYBRID_PRIMARYHIT) ) || \
	  ( defined(MATERIAL_PASS_HYBRID_SPATIALHASHDEBUG) )
	rd = initializeRayDifferential( -fs.vertexEye, uRayDifferentialViewUp, uRayDifferentialViewRight );
	propagateRayDifferential( -fs.vertexEye, fs.vertexEyeDistance, fs.geometricNormal, rd );
#elif defined(MATERIAL_PASS_RT_SECONDARYHIT) || \
	( defined(MATERIAL_PASS_HYBRID_INDIRECT) ) 
	rd = reconstructRayDifferential( fs.geometricNormal, fs.vertexEyeDistance, fs.dP, fs.dD );
#else
	rd.dP = makeScreenDifferential( fs.vertexPosition );
	rd.dD = makeScreenDifferential( -fs.vertexEye );
#endif
	return rd;
}

void propagateRayDifferential( FragmentState fs, inout RayDifferential rd )
{
	propagateRayDifferential( -fs.vertexEye, fs.vertexEyeDistance, fs.geometricNormal, rd );
}

#endif