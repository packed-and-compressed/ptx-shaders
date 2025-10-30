#ifndef LTC_COMMON_FRAG
#define LTC_COMMON_FRAG

// Adapted from:
// Real-Time Polygonal-Light Shading with Linearly Transformed Cosines.
// Eric Heitz, Jonathan Dupuy, Stephen Hill and David Neubelt.
// ACM Transactions on Graphics (Proceedings of ACM SIGGRAPH 2016) 35(4), 2016.
// Project page: https://eheitzresearch.wordpress.com/415-2/

#include "data/shader/common/util.sh"
#include "data/shader/common/const.sh"
#include "data/shader/common/tangentbasis.sh"
#include "data/shader/mat/other/lightParams.frag"

struct LtcSample
{
    // This represents the inverse matrix M^-1 that transforms the LTC (a distribution that best represents a BRDF) and a polygonal configuration 
    // into cosine distribution where the analytical shading for a polygonal light is known
    mat3 Minv;

    // Refer to LTC Fresnel Approximation by Stephen Hill
    // Represents normalization factor (n_d)
    float magnitude;
    // Represents the fresnel term (f_d)
    float fresnel;
};

//clamp LTC shape dimension based on distance to shaded point
float ltcClamp( float size, float dist, float invDist )
{
	//0.01 factor here was found to work well for maintaining float precision
	return ( size * invDist ) < 0.01 ? 0.01 * dist : size;
}

//==============================================================================
// Quad lights
//==============================================================================

vec3 ltcComputeEdgeFactor(vec3 v1, vec3 v2)
{
    // The theta (angle between v1 and v2) calculation based off PBRT v4 implementation, refer to Chapter 3, section 3.3.2 DOT AND CROSS PRODCUT
    // This implementation provided much better numerical stability than the approximation provided by the paper
    const float theta = ( dot(v1, v2) < 0 ) ?
        PI - 2.0 * asin(clamp(length(v1 + v2) * 0.5, -1.0, 1.0)) :
        2.0 * asin(clamp(length(v2 - v1) * 0.5, -1.0, 1.0));
    // Refer to "Geometric Derivation of the Irradiance of Polygonal Lights" by Eric Heitz
    return theta * normalize(cross(v1,v2)) * INVTWOPI;
}

float ltcIntegrateEdge(vec3 v1, vec3 v2)
{
    // 'v1' and 'v2' are represented in the shading coordinate system with N = (0, 0, 1)
    return ltcComputeEdgeFactor(v1, v2).z;
}

float ltcEvaluateQuad(
    TangentBasis tbn,
    mat3 Minv,
    LightRect rect,
    bool twoSided)
{
    // Rotate area light in (T1, T2, N) basis
    // transpose(mat3_columnmajor()) = mat3_rowmajor()
    Minv = mul(Minv, mat3_rowmajor(tbn.T, tbn.B, tbn.N));

    // Polygon (allocate 5 vertices for clipping)
    vec3 L[5];
    L[0] = mul( Minv, rect.p0 );
    L[1] = mul( Minv, rect.p1 );
    L[2] = mul( Minv, rect.p2 );
    L[3] = mul( Minv, rect.p3 );
    L[4] = vec3(0.0f, 0.0f, 0.0f);

    // 1. Clip to horizon

    // Detect clipping config
    uint config = 0;
    if (L[0].z > 0.0) config += 1;
    if (L[1].z > 0.0) config += 2;
    if (L[2].z > 0.0) config += 4;
    if (L[3].z > 0.0) config += 8;

    // Clip
    uint n = 0;
    switch (config)
    {
    case 0: // Clip all
        break;

    case 1: // V1 clip V2 V3 V4
        n = 3;
        L[1] = -L[1].z * L[0] + L[0].z * L[1];
        L[2] = -L[3].z * L[0] + L[0].z * L[3];
        break;

    case 2: // V2 clip V1 V3 V4
        n = 3;
        L[0] = -L[0].z * L[1] + L[1].z * L[0];
        L[2] = -L[2].z * L[1] + L[1].z * L[2];
        break;

    case 3: // V1 V2 clip V3 V4
        n = 4;
        L[2] = -L[2].z * L[1] + L[1].z * L[2];
        L[3] = -L[3].z * L[0] + L[0].z * L[3];
        break;

    case 4: // V3 clip V1 V2 V4
        n = 3;
        L[0] = -L[3].z * L[2] + L[2].z * L[3];
        L[1] = -L[1].z * L[2] + L[2].z * L[1];
        break;

    case 5: // V1 V3 clip V2 V4: impossible
        break;

    case 6: // V2 V3 clip V1 V4
        n = 4;
        L[0] = -L[0].z * L[1] + L[1].z * L[0];
        L[3] = -L[3].z * L[2] + L[2].z * L[3];
        break;

    case 7: // V1 V2 V3 clip V4
        n = 5;
        L[4] = -L[3].z * L[0] + L[0].z * L[3];
        L[3] = -L[3].z * L[2] + L[2].z * L[3];
        break;

    case 8: // V4 clip V1 V2 V3
        n = 3;
        L[0] = -L[0].z * L[3] + L[3].z * L[0];
        L[1] = -L[2].z * L[3] + L[3].z * L[2];
        L[2] = L[3];
        break;

    case 9: // V1 V4 clip V2 V3
        n = 4;
        L[1] = -L[1].z * L[0] + L[0].z * L[1];
        L[2] = -L[2].z * L[3] + L[3].z * L[2];
        break;

    case 10: // V2 V4 clip V1 V3: impossible
        break;

    case 11: // V1 V2 V4 clip V3
        n = 5;
        L[4] = L[3];
        L[3] = -L[2].z * L[3] + L[3].z * L[2];
        L[2] = -L[2].z * L[1] + L[1].z * L[2];
        break;

    case 12: // V3 V4 clip V1 V2
        n = 4;
        L[1] = -L[1].z * L[2] + L[2].z * L[1];
        L[0] = -L[0].z * L[3] + L[3].z * L[0];
        break;

    case 13: // V1 V3 V4 clip V2
        n = 5;
        L[4] = L[3];
        L[3] = L[2];
        L[2] = -L[1].z * L[2] + L[2].z * L[1];
        L[1] = -L[1].z * L[0] + L[0].z * L[1];
        break;

    case 14: // V2 V3 V4 clip V1
        n = 5;
        L[4] = -L[0].z * L[3] + L[3].z * L[0];
        L[0] = -L[0].z * L[1] + L[1].z * L[0];
        break;

    case 15: // V1 V2 V3 V4
        n = 4;
        break;
    }

    if (n == 0)
    { return 0.0; }

    // 2. Project onto sphere

    L[0] = normalize(L[0]);
    L[1] = normalize(L[1]);
    L[2] = normalize(L[2]);

    switch (n)
    {
        case 3:
            L[3] = L[0];
            break;
        case 4:
            L[3] = normalize(L[3]);
            L[4] = L[0];
            break;
        case 5:
            L[3] = normalize(L[3]);
            L[4] = normalize(L[4]);
            break;
    }
    
    // 3. Integrate
    
    float sum = ltcIntegrateEdge(L[0], L[1]);
    sum += ltcIntegrateEdge(L[1], L[2]);
    sum += ltcIntegrateEdge(L[2], L[3]);
    if (n >= 4)
    {
        sum += ltcIntegrateEdge(L[3], L[4]);
    }
    if (n == 5)
    {
        sum += ltcIntegrateEdge(L[4], L[0]);
    }
    return twoSided ? abs(sum) : max(0.0, sum);
}

//==============================================================================
// Spherical lights
//==============================================================================

// An extended version of the implementation from
// "How to solve a cubic equation, revisited"
// http://momentsingraphics.de/?p=105
vec3 ltcSolveCubic( vec4 coefs )
{
	// Normalize the polynomial
	coefs.xyz /= coefs.w;
	// Divide middle coefficients by three
	coefs.yz *= (1.0f / 3.0);

	float A = coefs.w;
	float B = coefs.z;
	float C = coefs.y;
	float D = coefs.x;

	// Compute the Hessian and the discriminant
	vec3 delta = vec3( -coefs.zy * coefs.zz + coefs.yx, dot( vec2( coefs.z, -coefs.y ), coefs.xy ) );

	// Discriminant
	float discr = dot( vec2( 4.0 * delta.x, -delta.y ), delta.zy );

	// Clamping avoid NaN output
	float sqrt_discr = sqrt( clamp( discr, 0.0, FLT_MAX ) );

	vec2 xlc, xsc;

	// Algorithm A
	{
		float A_a = 1.0;
		float C_a = delta.x;
		float D_a = -2.0 * B * delta.x + delta.y;

		// Take the cubic root of a normalized complex number
		float theta = atan2( sqrt_discr, -D_a ) / 3.0;

		float _2_sqrt_C_a = 2.0 * sqrt( -C_a );
		float x_1a = _2_sqrt_C_a * cos( theta );
		float x_3a = _2_sqrt_C_a * cos( theta + ( 2.0 / 3.0 ) * PI );

		float xl;
		if( ( x_1a + x_3a ) > 2.0 * B )
		{ xl = x_1a; }
		else
		{ xl = x_3a; }

		xlc = vec2( xl - B, A );
	}

	// Algorithm D
	{
		float A_d = D;
		float C_d = delta.z;
		float D_d = -D * delta.y + 2.0 * C * delta.z;

		// Take the cubic root of a normalized complex number
		float theta = atan2( D * sqrt_discr, -D_d ) / 3.0;

		float _2_sqrt_C_d = 2.0 * sqrt( -C_d );
		float x_1d = _2_sqrt_C_d * cos( theta );
		float x_3d = _2_sqrt_C_d * cos( theta + ( 2.0 / 3.0 ) * PI );

		float xs;
		if( ( x_1d + x_3d ) < 2.0 * C )
		{ xs = x_1d; }
		else
		{ xs = x_3d; }

		xsc = vec2( -D, xs + C );
	}

	float E = xlc.y * xsc.y;
	float F = -xlc.x * xsc.y - xlc.y * xsc.x;
	float G = xlc.x * xsc.x;

	vec2  xmc = vec2( C * F - B * G, -B * F + C * E );

	vec3  root = vec3( xsc.x / xsc.y, xmc.x / xmc.y, xlc.x / xlc.y );

	if( root.x < root.y && root.x < root.z )
	{
		root.xyz = root.yxz;
	}
	else if( root.z < root.x && root.z < root.y )
	{
		root.xyz = root.xzy;
	}

	return root;
}

float ltcEvaluateDisk(
    TangentBasis tbn,
    mat3 Minv,
    LightRect rect,
    bool twoSided)
{
    // Intermediate step: init ellipse
    vec3 L_[3];
    L_[0] = transformVecTo( tbn, rect.p0 );
    L_[1] = transformVecTo( tbn, rect.p1 );
    L_[2] = transformVecTo( tbn, rect.p2 );

    vec3 C = 0.5 * (L_[0] + L_[2]);
    vec3 V1 = 0.5 * (L_[1] - L_[2]);
    vec3 V2 = 0.5 * (L_[1] - L_[0]);

    // Transform ellipse by Minv to cosine space
    C = mul(Minv, C);
    V1 = mul(Minv, V1);
    V2 = mul(Minv, V2);

    // Clip back side
    if(!twoSided && dot(cross(V1, V2), C) < 0.0)
    {
        return 0.0;
    }

    // Compute eigenvectors of ellipse
    float		a, b; // Eigenvalues
    float		d11 = dot( V1, V1 );
    float		d22 = dot( V2, V2 );
    float		d12 = dot( V1, V2 );
    const float threshold = 0.0007;
    if( abs( d12 ) / sqrt( d11 * d22 ) > threshold )
    {
    	float tr = d11 + d22;
    	float det = -d12 * d12 + d11 * d22;

    	// use sqrt matrix to solve for eigenvalues
    	det = sqrt( det );
    	float u = 0.5 * sqrt( tr - 2.0 * det );
    	float v = 0.5 * sqrt( tr + 2.0 * det );
    	float e_max = ( u + v );
    	float e_min = ( u - v );
    	e_max *= e_max;
    	e_min *= e_min;

    	vec3 V1_, V2_;
    	if( d11 > d22 )
    	{
    		V1_ = d12 * V1 + ( e_max - d11 ) * V2;
    		V2_ = d12 * V1 + ( e_min - d11 ) * V2;
    	}
    	else
    	{
    		V1_ = d12 * V2 + ( e_max - d22 ) * V1;
    		V2_ = d12 * V2 + ( e_min - d22 ) * V1;
    	}

    	a = 1.0 / e_max;
    	b = 1.0 / e_min;
    	V1 = normalize( V1_ );
    	V2 = normalize( V2_ );
    }
    else
    {
    	a = 1.0 / d11;
    	b = 1.0 / d22;
    	V1 *= sqrt( a );
    	V2 *= sqrt( b );
    }

    // Now find front facing ellipse with same solid angle
    vec3 V3 = cross(V1, V2);
    if (dot(C, V3) < 0.0)
    {
        V3 *= -1.0;
    }

    float L = dot(V3, C);
    float x0 = dot(V1, C) / L;
    float y0 = dot(V2, C) / L;

    float L_sqr = L * L;
    a *= L_sqr;
    b *= L_sqr;

    float t = 1.0 + x0 * x0;
    float c0 = a * b;
    float c1 = c0 * (t + y0 * y0) - a - b;
    float c2 = (1.0 - a * t) - b * (1.0 + y0 * y0);
    float c3 = 1.0;

    vec3 roots = ltcSolveCubic(vec4(c0, c1, c2, c3));
    float e1 = roots.x;
    float e2 = roots.y;
    float e3 = roots.z;

    vec3 avgDir = vec3(a * x0 / (a - e2), b * y0 / (b - e2), 1.0);
    mat3 rotate = mat3_colmajor(V1, V2, V3);
    avgDir = normalize(mul(rotate, avgDir));

    // L1, L2 are the extends of the front facing ellipse
    float L1 = sqrt(-e2 / e3);
    float L2 = sqrt(-e2 / e1);

    const float formFactor = max(0.0, L1 * L2 * rsqrt((1.0 + L1 * L1) * (1.0 + L2 * L2)));
    // Sphere Integral approximation, refer to the slide 102 of LTC slides
    const float sphereIntegral = max((formFactor * formFactor + avgDir.z) / (formFactor + 1.0), 0.0);
    return formFactor * sphereIntegral;
}

float ltcEvaluate(LtcSample ltcSample, TangentBasis tbn, LightParams l)
{
    float ltc = 0.0;
	if ( l.size.z > 0.0 )
	{
#ifdef SceneHasSphereLights
		// Sphere area light
		ltc = ltcEvaluateDisk( tbn, ltcSample.Minv, l.rect, true );
#endif	
	}
	else
	{
#ifdef SceneHasRectLights
		// Rectangle area light
		ltc = ltcEvaluateQuad( tbn, ltcSample.Minv, l.rect, l.twoSided );
#endif
	}
    return ltc;
}

#endif // LTC_HLSLI
