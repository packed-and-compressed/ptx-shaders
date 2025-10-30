#include "../common/util.sh"
#include "../common/tangentbasis.sh"
#include "state.vert"

#ifdef VERT_MESHPULL
#define VERT_NOATTRIBS
#include "mesh.vert"
#endif

uniform mat4	uModelLightMatrix;
uniform mat4	uModelInverseTransposeLightMatrix;
uniform mat4	uModelViewProjectionMatrix;

uniform vec2	uMeshTexCoord0Offsets;
uniform vec2	uMeshTexCoord1Offsets;
uniform uint	uMeshVertexColors;
uniform uint    uMeshFromCurves;

BEGIN_PARAMS
	#ifdef VERT_NOATTRIBS
		#define vPosition						vec3(0.0,0.0,0.0)
		#define vColor							vec4(1.0,1.0,1.0,1.0)
		#define vTangent						vec4(1.0,0.0,0.0,1.0)
		#define vNormal							vec3(0.0,0.0,1.0)
		#define vTexCoord0						vec2(0.0,0.0)
		#define vTexCoord1						vec2(0.0,0.0)
		#define decodeUint101010Normalized(x)	(x)
		INPUT_VERTEXID(vID)
	#else
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
	#endif

	OUTPUT0(vec3,fPosition)
	OUTPUT1(vec4,fColor)
	OUTPUT2(vec3,fTangent)
	OUTPUT3(vec3,fBitangent)
	OUTPUT4(vec3,fNormal)
	OUTPUT5(vec4,fTexCoord)
#if defined( COMPUTE_MOTION_VECTOR )
	OUTPUT6(vec3,fVertexPosition)
#endif
#if (!defined( COMPUTE_MOTION_VECTOR )) && defined( EMULATE_BARYCENTRICS )
	OUTPUT6(vec2,fBarycentrics)
#elif defined( COMPUTE_MOTION_VECTOR ) && defined( EMULATE_BARYCENTRICS )
	OUTPUT7(vec2,fBarycentrics)
#endif
END_PARAMS
{
	VertexState s;
	#ifdef VERT_MESHPULL
		s = meshLoadVertex( meshLoadIndex(vID), uMeshTexCoord0Offsets, uMeshTexCoord1Offsets );
	#else
		s.rasterPosition.w = 1.0;
		s.rasterPosition.xyz =
		s.position = vPosition;
		s.tangent = decodeUint101010Normalized( vTangent.xyz );
		s.normal = decodeUint101010Normalized( vNormal );
		s.bitangent = reconstructBitangent( s.tangent, s.normal, vTangent.w );
		s.color = uMeshVertexColors ? vColor : vec4( 1.0, 1.0, 1.0, 1.0 );
		s.texCoord.uvCoord.xy = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
		if(uMeshFromCurves)
		{
			s.texCoord.uvCoord.zw = decodeHairSecondaryUVs( vTexCoord1, uMeshTexCoord1Offsets );
		}
		else
		{
			s.texCoord.uvCoord.zw = decodeUVs( vTexCoord1, uMeshTexCoord1Offsets );
		}
	#endif

	#ifdef VERT_NOATTRIBS
		s.vertexID = vID;
	#else
		s.vertexID = 0;
	#endif

	#ifdef Premerge
		Premerge(s);
	#endif
	
	s.rasterPosition = mulPoint( uModelViewProjectionMatrix, s.position );
	s.position = mulPoint( uModelLightMatrix, s.position ).xyz;
	s.tangent = normalize( mulVec( uModelInverseTransposeLightMatrix, s.tangent ) );
	s.bitangent = normalize( mulVec( uModelInverseTransposeLightMatrix, s.bitangent ) );
	s.normal = normalize( mulVec( uModelInverseTransposeLightMatrix, s.normal ) );
	
	#ifdef Merge
		Merge(s);
	#endif
	
	OUT_POSITION = s.rasterPosition;
	fPosition = s.position;
	fTangent = s.tangent;
	fBitangent = s.bitangent;
	fNormal = s.normal;
	fColor = s.color;
	fTexCoord = s.texCoord.uvCoord;
	#if defined( COMPUTE_MOTION_VECTOR )
		fVertexPosition = vPosition;
	#endif
	#ifdef EMULATE_BARYCENTRICS
		switch(s.vertexID % 3)
		{
		case 0: fBarycentrics = vec2(1.0, 0.0); break;
		case 1: fBarycentrics = vec2(0.0, 1.0); break;
		case 2: fBarycentrics = vec2(0.0, 0.0); break;
		}
	#endif
}
