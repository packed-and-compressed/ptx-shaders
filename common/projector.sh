#ifndef LAYER_PROJECTOR_SH
#define LAYER_PROJECTOR_SH

#include "differential.sh"
#include "util.sh"
#include "projectorplane.sh"
#include "tangentbasis.sh"


// -- Matrix Math --
//CPR gets column-major matrices from c++, and stores basis vectors in columns.
//CPR matrix columns should be accessed with the col0 .. col3 macros.
//Metal and GLSL mat[i] access returns columns, HLSL returns rows.
//Matrix-vector multiply is <row0.vec, row1.vec, row2.vec, row3.vec>
//CPR matrix-vector multiply is mul() and mulPoint()

// -- Normal Math -- 
// Triplanar UVs are determined by two transforms: texture and the projector.
// The texture transform is uv scale, offset, and rotation (UV TRS).
// Normal maps need an inverse UV-rotation performed on them after sampling.

// The projector matrix represents an arbitrary projector plane (with TBN bases) and is used to generate texture UVs from vertex positions.
// Three projector planes generate three sets of texture UVs. The results of these texture UVs are faded between by surface normal.
// When projecting normal maps 

// -- LayerRender Modelview --
// *** Compositing happens in projector space ***. The projector matrix is stored in the view portion of the Modelview matrix passed to the 
// vertex shader. This means every fragment rendered, every vertex position, and ever tangent vector is in projector-space when 
// compositing layers.

uniform float	uTripBend;
uniform float	uTripFragNormal;
uniform int		uPlanarClampCoords;	//planar mode can optionally clamp uv texture tiling

///////////////////////////////////////////////////////////////////////////////
/// Utilities
///////////////////////////////////////////////////////////////////////////////

float	mix3( float a, float b, float c, vec3 w)
{ return a*w.x + b*w.y + c*w.z; }

vec2	mix3( vec2 a, vec2 b, vec2 c, vec3 w)
{ return a*w.x + b*w.y + c*w.z; }

vec3	mix3( vec3 a, vec3 b, vec3 c, vec3 w)
{ return a*w.x + b*w.y + c*w.z; }

vec4	mix3( vec4 a, vec4 b, vec4 c, vec3 w)
{ return a*w.x + b*w.y + c*w.z; }

//mixer functions that dont include anything with very low weight that might have resulted in bad values up the road
vec4 	carefulMix3(in vec4 v0, in vec4 v1, in vec4 v2, in vec3 weights)
{
	vec4 result = vec4(0.0, 0.0, 0.0, 0.0);
	float thresh = 1e-7;
	if(weights.x > thresh)
	{ result += v0 * weights.x; }
	if(weights.y > thresh)
	{ result += v1 * weights.y; }
	if(weights.z > thresh)
	{ result += v2 * weights.z; }
	return result;
}

vec3 	carefulMix3(in vec3 v0, in vec3 v1, in vec3 v2, in vec3 weights)
{
	vec3 result = vec3(0.0, 0.0, 0.0);
	float thresh = 1e-7;
	if(weights.x > thresh)
	{ result += v0 * weights.x; }
	if(weights.y > thresh)
	{ result += v1 * weights.y; }
	if(weights.z > thresh)
	{ result += v2 * weights.z; }
	return result;
}

vec3 _toSpace( vec3 n, mat4 TBN )
{
	return  vec3(
		dot( n, col0(TBN).xyz ),
		dot( n, col1(TBN).xyz ),
		dot( n, col2(TBN).xyz )
	);
}

vec3 _toSpace( vec3 n, vec3 tangent, vec3 bitangent, vec3 normal )
{
	return vec3(
		dot( n, tangent ),
		dot( n, bitangent ),
		dot( n, normal )
	);
}

mat4 _toSpace( mat4 m, mat4 TBN )
{ return mul( transpose(TBN), m ); }

vec3 _fromSpace( vec3 n, mat4 TBN )
{ return mulVec( TBN, n ); }

vec3 _fromSpace( vec3 n, vec3 tangent, vec3 bitangent, vec3 normal )
{ return n.x * tangent + (n.y * bitangent + (n.z * normal)); }

mat4 _fromSpace( mat4 m, mat4 TBN )
{ return mul( TBN, m ); }

mat4 _identity()
{
	return mat4(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0
	);
}

///////////////////////////////////////////////////////////////////////////////
/// Projectors & friends
///////////////////////////////////////////////////////////////////////////////

struct PlanarProjector
{
	vec3 T;
	vec3 B;
	vec3 N;
	vec4 uv;  // Uvs and packed grads
	ProjectorPlane plane;
};

struct TriplanarProjector
{
	vec3 T;
	vec3 B;
	vec3 N;
	vec3 fade;	

	//use these to sample the same image from 3 different angles (Uvs and packed grads)
	vec4 uvX;
	vec4 uvY;
	vec4 uvZ;

	ProjectorPlane triplaneX;
	ProjectorPlane triplaneY;
	ProjectorPlane triplaneZ;
};

///////////////////////////////////////////////////////////////////////////////
/// Utilities - part 2
///////////////////////////////////////////////////////////////////////////////

// A tangent-space normal map that is projected onto an actual mesh needs to be transmogrified to fit that meshs tangent layout.
// Here we consider tap_x,_y, and _z to be projector-space normals, oriented along each projector face. We need to transform the
// normals to mesh tangent space after projection. 

// 1. transform projector TBN vectors to mesh tangent space
// 2. "flatten" the projector TBN vectors along the mesh surface by setting .z to 0
// 3. orthonormalize and store in surf_xyz_TBN
// 4. surf_xyz_TBN are matrices to take normals in projector-space to mesh-tangent-space

// old, complex function used by PaintMerge.frag exclusively
void projectPremultTangents( out mat4 surfTBN, in mat4 meshTBN, in ProjectorPlane plane )
{
	surfTBN = _identity();
	
	//Get projector cube bases in mesh tangent space    
	vec3 T, B, N;

    T = _toSpace( plane.U, meshTBN );
    B = _toSpace( plane.V, meshTBN );
	
	N = vec3(0.0,0.0,1.0);
	T = normalize( T - dot( T, N) * N );
    B = normalize( B - dot( B, N) * N );

	col0( surfTBN ).xyz = T;
	col1( surfTBN ).xyz = B;
	col2( surfTBN ).xyz = N;
}

void projectTangents( out mat4 surfTBN, in vec3 meshN, in ProjectorPlane plane )
{
	surfTBN = _identity();
	vec3 surfT = plane.U;
	vec3 surfB = plane.V;
	vec3 surfN = meshN;

	col0(surfTBN).xyz = normalizeSafe( surfT - dot( surfT, surfN) * surfN );
	col1(surfTBN).xyz = normalizeSafe( surfB - dot( surfB, surfN) * surfN );
	col2(surfTBN).xyz = surfN;
}

///////////////////////////////////////////////////////////////////////////////
/// Monoplanar mix
///////////////////////////////////////////////////////////////////////////////

vec4 monoplanarMix( in TriplanarProjector p, vec4 tap)
{
	return tap;
}

vec4 monoplanarMixNormals( in TriplanarProjector p, vec4 tap)
{
	ProjectorPlane plane;
	plane.U = mix3(p.triplaneX.U, p.triplaneY.U, p.triplaneZ.U, p.fade.xyz);
	plane.V = mix3(p.triplaneX.V, p.triplaneY.V, p.triplaneZ.V, p.fade.xyz);
	
	tap.xyz = tap.xyz * 2.0 - vec3(1.0, 1.0, 1.0);
	
	//projection-space to mesh-space transforms
	mat4 meshTBN = _identity();
	col0(meshTBN).xyz = p.T;
	col1(meshTBN).xyz = p.B;
	col2(meshTBN).xyz = p.N;

	mat4 surfTBN;
	projectTangents( surfTBN, p.N, p.triplaneZ );
	
	//pull taps from projector-space to mesh-space
	tap.xyz = _fromSpace( tap.xyz, surfTBN );
	tap.xyz = _toSpace( tap.xyz, meshTBN );
	tap.xyz = normalize(tap.xyz) * 0.5 + vec3(0.5,0.5,0.5);

	return tap;
}

///////////////////////////////////////////////////////////////////////////////
/// Triplanar mix
///////////////////////////////////////////////////////////////////////////////

void projectTaps( inout vec4 tap_x, inout vec4 tap_y, inout vec4 tap_z, in TriplanarProjector p, in vec3 normal )
{
    mat4 xsurfTBN, ysurfTBN, zsurfTBN;

    projectTangents( xsurfTBN, normal, p.triplaneX );
    projectTangents( ysurfTBN, normal, p.triplaneY );
    projectTangents( zsurfTBN, normal, p.triplaneZ );
		
	//pull taps from projector-space to obj-space
    tap_x.xyz = _fromSpace( tap_x.xyz, xsurfTBN );
    tap_y.xyz = _fromSpace( tap_y.xyz, ysurfTBN );
    tap_z.xyz = _fromSpace( tap_z.xyz, zsurfTBN );
}

void projectTaps( inout vec4 tap_x, inout vec4 tap_y, inout vec4 tap_z, in TriplanarProjector p )
{
    projectTaps( tap_x, tap_y, tap_z, p, p.N );
}

/// Do this between getTriplanarProjector() and triplanarMix():
// tap_x = texture2D( [projected texture], p.uvX );
// tap_y = texture2D( [projected texture], p.uvY );
// tap_z = texture2D( [projected texture], p.uvZ );

vec4 triplanarMix( in TriplanarProjector p, vec4 tap_x, vec4 tap_y, vec4 tap_z )
{
	return mix3( tap_x, tap_y, tap_z, p.fade );
}

vec4 triplanarCarefulMix( in TriplanarProjector p, vec4 tap_x, vec4 tap_y, vec4 tap_z )
{
	return carefulMix3( tap_x, tap_y, tap_z, p.fade );
}

float triplanarMix( in TriplanarProjector p, float tap_x, float tap_y, float tap_z )
{
	return mix3( tap_x, tap_y, tap_z, p.fade );
}

vec4 triplanarMixNormals( in TriplanarProjector p, vec4 tap_x, vec4 tap_y, vec4 tap_z )
{
//different mixing for paint
#ifdef MATERIAL_PASS_PAINT
	return vec4( carefulMix3( tap_x.xyz, tap_y.xyz, tap_z.xyz, p.fade ), 1.0);
#else	//!MATERIAL_PASS_PAINT
	tap_x.xyz = tap_x.xyz * 2.0 - vec3(1.0, 1.0, 1.0);
	tap_y.xyz = tap_y.xyz * 2.0 - vec3(1.0, 1.0, 1.0);
	tap_z.xyz = tap_z.xyz * 2.0 - vec3(1.0, 1.0, 1.0);

	//projection-space to mesh-space transforms
	mat4 meshTBN = _identity();
	col0(meshTBN).xyz = p.T;
	col1(meshTBN).xyz = p.B;
	col2(meshTBN).xyz = p.N;

	projectTaps( tap_x, tap_y, tap_z, p );

	vec4 tap = carefulMix3( tap_x, tap_y, tap_z, p.fade );

	//put tap into mesh-tangent-space
	tap.xyz = _toSpace( tap.xyz, meshTBN );
	tap.xyz = normalize(tap.xyz) * 0.5 + vec3(0.5,0.5,0.5);
	return tap;
#endif //MATERIAL_PASS_PAINT
}

///////////////////////////////////////////////////////////////////////////////
/// Triplanar projection
///////////////////////////////////////////////////////////////////////////////

// simpler projector with vertex tangent space only
TriplanarProjector newTriplanarProjector()
{
	TriplanarProjector p;

	p.T = vec3( 0, 0, 0 );
	p.B = vec3( 0, 0, 0 );
	p.N = vec3( 0, 0, 0 );
	p.fade = vec3( 0, 0, 0 );

	p.uvX = vec4( 0, 0, 0, 0 );
	p.uvY = vec4( 0, 0, 0, 0 );
	p.uvZ = vec4( 0, 0, 0, 0 );

	p.triplaneX = newProjectorPlane();
	p.triplaneY = newProjectorPlane();
	p.triplaneZ = newProjectorPlane();
	
	return p;
}

TriplanarProjector getTriplanarProjector( vec3 fP, vec3 vN, TangentBasis basis, vec4 textureScaleBias, vec2 textureRotation, float fade, bool frontFacing = true )
{
	TriplanarProjector p;
    p.T = basis.T;
    p.B = basis.B;
    p.N = basis.N;

	/// Triplanar Fade 	
    p.fade = pow( vN * vN, 1.0 / ( 0.015 + ( 1.25 * fade ) ) );
	p.fade = p.fade / (p.fade.x + p.fade.y + p.fade.z);

	/// Triplanar Tap
	vec3 triPosition = fP;

	triPosition.z = -triPosition.z;
	triPosition = 0.5 * triPosition + vec3(0.5,0.5,0.5);

	//positive or negative face of projector cube?
	vec4 facing = vec4( 2.0 * vec3( vN > 0.0 ) - 1.0, 1.0 );
	HINT_FLATTEN if( !frontFacing ) { facing.xyz = -facing.xyz; }

	p.uvX.xy = triPosition.zy * facing.xw;
	p.uvY.xy = triPosition.xz * facing.yw;
	p.uvZ.xy = triPosition.xy * facing.zw;

	// UV scale/offset
	p.uvX.xy = transformUV( p.uvX.xy, textureScaleBias, textureRotation );
	p.uvY.xy = transformUV( p.uvY.xy, textureScaleBias, textureRotation );
	p.uvZ.xy = transformUV( p.uvZ.xy, textureScaleBias, textureRotation );
		
	/// triplanar face orientations		
	const vec3 X = vec3(1.0,0.0,0.0);
	const vec3 Y = vec3(0.0,1.0,0.0);
	const vec3 Z = vec3(0.0,0.0,1.0);

	vec4 tangentSpaceFacing = vec4( 2.0 * vec3( basis.N > 0.0 ) - 1.0, 1.0 );
	HINT_FLATTEN if( !frontFacing ) { tangentSpaceFacing.xyz = -tangentSpaceFacing.xyz; }
	
    p.triplaneX.U = -Z * tangentSpaceFacing.x;
	p.triplaneX.V =  Y;
    p.triplaneY.U = X * tangentSpaceFacing.y;
	p.triplaneY.V = -Z;
    p.triplaneZ.U = X * tangentSpaceFacing.z;
	p.triplaneZ.V = Y;

	return p;
}

// simpler projector with vertex tangent space only
TriplanarProjector getTriplanarProjectorLod( vec3 fP, vec3 vN, TangentBasis basis, vec3 dPdx, vec3 dPdy, vec4 textureScaleBias, vec2 textureRotation, vec4 materialScaleBias, vec2 materialRotation, float fade, bool frontFacing = true )
{
	TriplanarProjector p;
    p.T = basis.T;
    p.B = basis.B;
    p.N = basis.N;

	/// Triplanar Fade 	
    p.fade = pow( vN * vN, 1.0 / ( 0.015 + ( 1.25 * fade ) ) );
	p.fade = p.fade / (p.fade.x + p.fade.y + p.fade.z);

	/// Triplanar Tap
	vec3 triPosition = fP;
	vec3 triPosition2 = fP + dPdx;
	vec3 triPosition3 = fP + dPdy;
	triPosition.z = -triPosition.z;
	triPosition2.z = -triPosition2.z;
	triPosition3.z = -triPosition3.z;
	triPosition = 0.5 * triPosition + vec3(0.5,0.5,0.5);
	triPosition2 = 0.5 * triPosition2 + vec3(0.5, 0.5, 0.5);
	triPosition3 = 0.5 * triPosition3 + vec3(0.5, 0.5, 0.5);
	
	vec4 facing = vec4( 2.0 * vec3( vN > 0.0 ) - 1.0, 1.0 );	//positive or negative face of projector cube?
	HINT_FLATTEN if( !frontFacing ) { facing.xyz = -facing.xyz; }

	p.uvX.xy = triPosition.zy * facing.xw;
	p.uvY.xy = triPosition.xz * facing.yw;
	p.uvZ.xy = triPosition.xy * facing.zw;

	// UV scale/offset
	p.uvX.xy = transformUV( p.uvX.xy, textureScaleBias, textureRotation );
	p.uvY.xy = transformUV( p.uvY.xy, textureScaleBias, textureRotation );
	p.uvZ.xy = transformUV( p.uvZ.xy, textureScaleBias, textureRotation );
	
#if (defined(SHADER_COMPUTE) || defined(LAYER_COMPUTE))
	//more UVs for determining mipmap
	vec2 uvX2 = triPosition2.zy * facing.xw;
	vec2 uvY2 = triPosition2.xz * facing.yw;
	vec2 uvZ2 = triPosition2.xy * facing.zw;

	vec2 uvX3 = triPosition3.zy * facing.xw;
	vec2 uvY3 = triPosition3.xz * facing.yw;
	vec2 uvZ3 = triPosition3.xy * facing.zw;
	
//account for material scaling in compute shaders
	vec2 scale = vec2(1.0, 1.0);
#ifdef MATERIAL_PASS_PAINT
	scale = materialScaleBias.xy;
#endif
	
	vec2 uvX = p.uvX.xy;
	vec2 uvY = p.uvY.xy;
	vec2 uvZ = p.uvZ.xy;
	uvX2 = transformUV( uvX2, textureScaleBias, textureRotation );
	uvY2 = transformUV( uvY2, textureScaleBias, textureRotation );
	uvZ2 = transformUV( uvZ2, textureScaleBias, textureRotation );
	
	uvX3 = transformUV( uvX3, textureScaleBias, textureRotation );
	uvY3 = transformUV( uvY3, textureScaleBias, textureRotation );
	uvZ3 = transformUV( uvZ3, textureScaleBias, textureRotation );
		
	//collect all the partials
	p.uvX.zw = packTextureGrads( makeDifferential( (uvX2-uvX) * scale, (uvX3-uvX) * scale ) );
	p.uvY.zw = packTextureGrads( makeDifferential( (uvY2-uvY) * scale, (uvY3-uvY) * scale ) );
	p.uvZ.zw = packTextureGrads( makeDifferential( (uvZ2-uvZ) * scale, (uvZ3-uvZ) * scale ) );
#endif  // defined(SHADER_COMPUTE) || defined(LAYER_COMPUTE)

#ifdef MATERIAL_PASS_PAINT
	//Scaled by material system UV tile/offset parameter because we recomputed what came to us from mat.vert
	p.uvX.xy = transformUV( p.uvX.xy, materialScaleBias, materialRotation );
	p.uvY.xy = transformUV( p.uvY.xy, materialScaleBias, materialRotation );
	p.uvZ.xy = transformUV( p.uvZ.xy, materialScaleBias, materialRotation );
#endif

	vec4 tangentSpaceFacing = vec4( 2.0 * vec3( basis.N > 0.0 ) - 1.0, 1.0 );
	HINT_FLATTEN if( !frontFacing ) { tangentSpaceFacing.xyz = -tangentSpaceFacing.xyz; }	
	
	/// triplanar face orientations		
	const vec3 X = vec3(1.0,0.0,0.0);
	const vec3 Y = vec3(0.0,1.0,0.0);
	const vec3 Z = vec3(0.0,0.0,1.0);

    p.triplaneX.U = -Z * tangentSpaceFacing.x;
	p.triplaneX.V =  Y;
    p.triplaneY.U = X * tangentSpaceFacing.y;
	p.triplaneY.V = -Z;
    p.triplaneZ.U = X * tangentSpaceFacing.z;
	p.triplaneZ.V = Y;

	return p;
}

/// projector with fragment normal present
TriplanarProjector getTriplanarProjectorLod( vec3 fP, vec3 vN, vec3 fN, TangentBasis basis, vec3 dPdx, vec3 dPdy, vec4 textureScaleBias, vec2 textureRotation, vec4 materialScaleBias, vec2 materialRotation, float fade, bool frontFacing = true )
{
	/// Compute "bent" fragment position
	vec3 bend = vN * uTripBend * (1.0-abs(fN.z));
	
	/// Create whole new tangent-space
	fN = _fromSpace( fN.xyz, basis.T, basis.B, basis.N );
	vec3 newN = normalize( lerp( basis.N, fN, uTripFragNormal ) );
    vec3 newT = normalize( basis.T - dot(basis.T, newN) * newN );
    vec3 newB = normalize( basis.B - dot(basis.B, newN) * newN );

	return getTriplanarProjectorLod( fP + bend, newN, createTangentBasis( newT, newB, newN ), dPdx, dPdy, textureScaleBias, textureRotation, materialScaleBias, materialRotation, fade, frontFacing );
}

/// projector with fragment normal present
TriplanarProjector getTriplanarProjector( vec3 fP, vec3 vN, vec3 fN, TangentBasis basis, vec4 textureScaleBias, vec2 textureRotation, float fade, bool frontFacing = true )
{
	/// Compute "bent" fragment position
    vec3 bend = vN * uTripBend * (1.0 - abs(fN.z));
	
	/// Create whole new tangent-space
    fN = _fromSpace( fN.xyz, basis.T, basis.B, basis.N );
	vec3 newN = normalize( lerp( basis.N, fN, uTripFragNormal ) );
    vec3 newT = normalize( basis.T - dot(basis.T, newN) * newN );
    vec3 newB = normalize( basis.B - dot(basis.B, newN) * newN );

	return getTriplanarProjector( fP + bend, newN, createTangentBasis( newT, newB, newN ), textureScaleBias, textureRotation, fade, frontFacing );
}

///////////////////////////////////////////////////////////////////////////////
/// Planar projection
///////////////////////////////////////////////////////////////////////////////

vec2 projectPlanarCoordinates( vec3 coord, vec4 textureScaleBias, vec2 textureRotation )
{
	coord *= 0.5;
	coord.x += 0.5;
	coord.y += 0.5;
	coord.z += 0.5;
	vec2 uv;
	uv.x = coord.x;
	uv.y = coord.y;
	uv = transformUV( uv, textureScaleBias, textureRotation );
	if( uPlanarClampCoords != 0 )
	{ uv = clamp(uv, 0.0, 1.0); }
	return uv;
}

PlanarProjector getPlanarProjector( vec3 fP, vec3 vT, vec3 vB, vec3 vN, vec4 textureScaleBias, vec2 textureRotation )
{
	PlanarProjector p;

	/// Projector-space tangent vectors at fP
	p.T = vT;
	p.B = vB;
	p.N = vN;

	/// Planar Tap
	p.uv.xy = projectPlanarCoordinates( fP, textureScaleBias, textureRotation );

	/// Projector-space plane axes (always XY constants)
	p.plane.U = vec3(1.0,0.0,0.0);
	p.plane.V = vec3(0.0,1.0,0.0);
	p.uv.zw = packTextureGrads( makeDifferential( vec2(0.001, 0.0), vec2(0.0, 0.001) ) );

	return p;
}

PlanarProjector getPlanarProjector( vec3 fP, vec3 vT, vec3 vB, vec3 vN, vec3 fN, vec4 textureScaleBias, vec2 textureRotation )
{
	//transform input normal into same projection-object space as the mesh tangents are
	fN = _fromSpace( fN.xyz, vT, vB, vN );
	return getPlanarProjector( fP, vT, vB, fN, textureScaleBias, textureRotation );
}

PlanarProjector getPlanarProjectorLod( vec3 fP, vec3 vT, vec3 vB, vec3 vN, vec3 dPdx, vec3 dPdy, vec4 textureScaleBias, vec2 textureRotation, vec4 materialScaleBias, vec2 materialRotation )
{
	PlanarProjector p;

	/// Projector-space tangent vectors at fP
	p.T = vT;
	p.B = vB;
	p.N = vN;

	/// Planar Tap
	p.uv.xy = projectPlanarCoordinates( fP, textureScaleBias, textureRotation );
	vec2 uv2 = projectPlanarCoordinates( fP + dPdx, textureScaleBias, textureRotation );
	vec2 uv3 = projectPlanarCoordinates( fP + dPdy, textureScaleBias, textureRotation );
	//account for material scaling in compute shaders
	vec2 scale = vec2(1.0, 1.0);
#ifdef MATERIAL_PASS_PAINT
	scale = materialScaleBias.xy;
#endif
	vec2 uv1 = p.uv.xy;
	p.uv.zw = packTextureGrads( makeDifferential( (uv2-uv1) * scale, (uv3-uv1) * scale ) );
	
#ifdef MATERIAL_PASS_PAINT
	//Scaled by material system UV tile/offset parameter because we recomputed what came to us from mat.vert
	p.uv.xy = transformUV( p.uv.xy, textureScaleBias, textureRotation );
#endif

	/// Projector-space plane axes (always XY constants)
	p.plane.U = vec3(1.0,0.0,0.0);
	p.plane.V = vec3(0.0,1.0,0.0);
	return p;
}

PlanarProjector getPlanarProjectorLod( vec3 fP, vec3 vT, vec3 vB, vec3 vN, vec3 fN, vec3 dPdx, vec3 dPdy, vec4 textureScaleBias, vec2 textureRotation, vec4 materialScaleBias, vec2 materialRotation )
{
	//transform input normal into same projection-object space as the mesh tangents are
	fN = _fromSpace( fN.xyz, vT, vB, vN );
	return getPlanarProjectorLod( fP, vT, vB, fN, dPdx, dPdy, textureScaleBias, textureRotation, materialScaleBias, materialRotation );

}

///////////////////////////////////////////////////////////////////////////////
/// Planar mix
///////////////////////////////////////////////////////////////////////////////

vec4 planarMix( in PlanarProjector samp, vec4 tap )
{
	return tap;
}

vec4 planarMixNormals( in PlanarProjector samp, vec4 tap )
{
#ifdef MATERIAL_PASS_PAINT
	return tap;
#endif

	/// Retagentiation
	tap.xyz = tap.xyz * 2.0 - vec3(1.0, 1.0, 1.0);
	
	//projection-space to mesh-space transforms
	mat4 meshTBN = _identity();
	col0(meshTBN).xyz = samp.T;
	col1(meshTBN).xyz = samp.B;
	col2(meshTBN).xyz = samp.N;

	mat4 surfTBN;
	projectTangents( surfTBN, samp.N, samp.plane );

	//pull taps from projector-space to mesh-space
	tap.xyz = _fromSpace( tap.xyz, surfTBN );	// pull texture taps out of projector-tangent-space into projector-object-space
	tap.xyz = _toSpace( tap.xyz, meshTBN );		// put proj-obj-space tap into mesh-tangent-space for final compositing
	tap.xyz = normalize(tap.xyz) * 0.5 + vec3(0.5,0.5,0.5);
	return tap;
}

#endif
