#include "mesh.comp"
#include "commonPaint.sh"
#include "../common/util.sh"
#include "../common/tangentbasis.sh"

uniform int		uStartIndex;
uniform mat4 	uNormalMatrix;
uniform mat4	uModelMatrix;
uniform mat4	uModelBrushMatrix[SPLOT_COUNT];
uniform mat4	uPostTransform[SPLOT_COUNT];	//paintspace transform for shaping the splot
uniform mat4	uCombinedTransforms[SPLOT_COUNT];	//all transforms combined??
uniform float	uFlip;
uniform vec2	uUVShift;		//for drawing UVs that reside outside of the 0-1 range
uniform float	uAspect;			//aspect of the texture we're painting to
uniform mat4	uViewProjectionMatrix;
uniform float	uFake2D;	//used for UV mode or painting preview in 3D space
uniform vec2 	uInputUVShift;	//used for UV brush projection on multiple texture sets
uniform vec2	uMeshTexCoord0Offsets;

bool cullTri(vec2 v1, vec2 v2, vec2 v3)
{
	if(v1.x < -1.0 && v2.x < -1.0)
	{ return true; }
	
	if(v1.x > 1.0 && v2.x > 1.0)
	{ return true; }
	if(v1.y > 1.0 && v2.y > 1.0)
	{ return true; }
	if(v1.y < -1.0 && v2.y < -1.0)
	{ return true; }
	
	return false;
}

BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec3, fNormal)
	OUTPUT1(vec3, fTangent)
	OUTPUT2(vec3, fPosition)
#define SPLOT_TYPE vec4
	OUTPUT3(SPLOT_TYPE, fBrushCoord0)
	

#if(SPLOT_COUNT > 1)
	OUTPUT4(SPLOT_TYPE, fBrushCoord1)
#endif

#if(SPLOT_COUNT > 2)
	OUTPUT5(SPLOT_TYPE, fBrushCoord2)
#endif
#if(SPLOT_COUNT > 3)
	OUTPUT6(SPLOT_TYPE, fBrushCoord3)
#endif
#if(SPLOT_COUNT > 4)
	OUTPUT7(SPLOT_TYPE, fBrushCoord4)
#endif
#if(SPLOT_COUNT > 5)
	OUTPUT8(SPLOT_TYPE, fBrushCoord5)
#endif
#if(SPLOT_COUNT > 6)
	OUTPUT9(SPLOT_TYPE, fBrushCoord6)
#endif
#if(SPLOT_COUNT > 7)
	OUTPUT10(SPLOT_TYPE, fBrushCoord7)
#endif
#if(SPLOT_COUNT > 8)
	OUTPUT11(SPLOT_TYPE, fBrushCoord8)
#endif
#if(SPLOT_COUNT > 9)
	OUTPUT12(SPLOT_TYPE, fBrushCoord9)
#endif
#if(SPLOT_COUNT > 10)
	OUTPUT13(SPLOT_TYPE, fBrushCoord10)
#endif
#if(SPLOT_COUNT > 11)
	OUTPUT14(SPLOT_TYPE, fBrushCoord11)
#endif
#if(SPLOT_COUNT > 12)
	OUTPUT15(SPLOT_TYPE, fBrushCoord12)
#endif
#if(SPLOT_COUNT > 13)
	OUTPUT16(SPLOT_TYPE, fBrushCoord13)
#endif
#if(SPLOT_COUNT > 14)
	OUTPUT17(SPLOT_TYPE, fBrushCoord14)
#endif
#if(SPLOT_COUNT > 15)
	OUTPUT18(SPLOT_TYPE, fBrushCoord15)
#endif

END_PARAMS
{
	uint3 verts = loadTriangle( vID/3 + uStartIndex/3 );
	int of3 = vID%3;
	
	//rearrange the combonents so the current vertex is the last one
	verts = (of3 == 0) ? verts.zyx : (of3==1) ? verts.zxy : verts.xyz;
	Vertex v1 = loadVertex(verts.x);
	Vertex v2 = loadVertex(verts.y);
	Vertex v3 = loadVertex(verts.z);
	v1.texcoord += uInputUVShift;
	v2.texcoord += uInputUVShift;
	v3.texcoord += uInputUVShift;
	vec2 texCoord0 = v3.texcoord;
	vec3 vPosition = v3.position;
	vec3 vNormal = v3.normal;
	vec3 vTangent = v3.tangent;
	vec2 mins = vec2(9999.0, 9999.0);
	vec2 maxs = -mins;
	
#define USE_COMBINED_TRANSFORM
#ifdef USE_W
	#define MINMAX(var) mins=min(mins, var.xy/var.w); maxs=max(maxs, var.xy/var.w);
#else
	#define MINMAX(var) mins=min(mins, var.xy); maxs=max(maxs, var.xy);
#endif

#ifndef USE_COMBINED_TRANSFORM
	#define getFrustumPoint(var, n, vert) \
	var.xyz = mix(mulPoint(uModelMatrix, vert.position).xyz, vec3(vert.texcoord, 0.0), uFake2D).xyz;\
	var = mulPoint( uModelBrushMatrix[n], var.xyz );\
	var.xyz = mulPoint(uPostTransform[n], var.xyz/var.w).xyz*var.w;\
	MINMAX(var)\
	fBrushCoord##n = var;
#else
	#define getFrustumPoint(var, n, vert) \
	var.xyz = mix(mulPoint(uModelMatrix, vert.position).xyz, vec3(vert.texcoord, 0.0), uFake2D).xyz;\
	var = mulPoint( uCombinedTransforms[n], var.xyz );\
	MINMAX(var)\
	fBrushCoord##n = var;
#endif	
	vec4 p1, p2, p3;
	//find min and max frustum points for each vert/splot combination
	#define splotThing(n) getFrustumPoint(p1, n, v1); getFrustumPoint(p2, n, v2); getFrustumPoint(p3, n, v3);
	DO_ALL_SPLOTS
	
/*
#ifndef USE_COMBINED_TRANSFORM

	#define doSplot(n) \
	brushSpace.xyz = vertexPos;\
	brushSpace = mulPoint( uModelBrushMatrix[n], brushSpace.xyz ); \
	brushSpace.xyz = mulPoint(uPostTransform[n], brushSpace.xyz/brushSpace.w).xyz*brushSpace.w;\
	fBrushCoord##n = brushSpace;\
	fBrushCoord##n.z = mix(fBrushCoord##n.z, 0.5, uFake2D);	//flatten Z in UV painting

#else
	#define doSplot(n) \
	brushSpace.xyz = vertexPos;\
	brushSpace = mulPoint( uCombinedTransforms[n], brushSpace.xyz ); \
	fBrushCoord##n = brushSpace;\
	fBrushCoord##n.z = mix(fBrushCoord##n.z, 0.5, uFake2D);	//flatten Z in UV painting
#endif
*/	 
	//paint-space position is vertex pos when 3D painting, or tex coord when emulating 2D painting
//	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	vec3 vertexPos = mix(mulPoint(uModelMatrix, vPosition).xyz, vec3(texCoord0.xy - uUVShift, 0.0), uFake2D).xyz;
	vec4 brushSpace;
	#undef splotThing
	#define splotThing(n) fBrushCoord##n.z = mix(fBrushCoord##n.z, 0.5, uFake2D);	//flatten Z in UV painting
	DO_ALL_SPLOTS

	vec3 normal = (vNormal);
	vec3 tangent = (vTangent.xyz);

	fNormal = mulVec(uNormalMatrix, normal);
	fTangent = mulVec(uModelMatrix, tangent);
	fPosition = mulPoint(uModelMatrix, vPosition).xyz;
	
#if(TEST_NORMAL==FACE)	//with face normals, send the vertex position through the tangent pipe
	fTangent = mulPoint(uModelMatrix, vPosition).xyz; 
#endif

	//output can be in 3D space for viewport preview, or 2D texturespace space for UV preview or actual painting
	vec4 texSpace = vec4(2.0*(texCoord0.xy - uUVShift) - vec2(1.0,1.0), 0.0, 1.0);
	texSpace.xyz = mulPoint(uViewProjectionMatrix, texSpace.xyz).xyz;
	texSpace.y *= uFlip;

	OUT_POSITION = texSpace;
	
	//if our triangle is outside the frustum of all the splots, cull the triangle
	if(cullTri(mins.xy, maxs.xy, mins.xy))
	{
		OUT_POSITION.z = 9999.0;
	} 

}
