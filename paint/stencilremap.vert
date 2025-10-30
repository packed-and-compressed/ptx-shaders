//draws geometry in UV space, but samples the stencil texture based on 3D position!
#include "../common/util.sh"

uniform mat4	uModelViewProjectionMatrix;
uniform mat4	uModelMatrix;
uniform vec2	uMeshTexCoord0Offsets;
uniform int 	u2DMode;
uniform int2	uTile;		//UDIM tile
BEGIN_PARAMS
	INPUT0(vec3,vPosition)
	INPUT1(vec4,vTangent)
	INPUT2(vec3,vNormal)
	INPUT3(vec2,vTexCoord0)
	INPUT4(vec2,vTexCoord1)
	INPUT5(vec4,vColor)
	OUTPUT0(vec4, fPosition)
END_PARAMS
{	
	vec4 p = mulPoint( uModelViewProjectionMatrix, mulPoint( uModelMatrix, vPosition ).xyz ); 

	vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );
	vec2 canvasPos = mulPoint(uModelViewProjectionMatrix, vec3( texCoord0, 0.0)).xy;
	texCoord0 -= vec2(uTile);
	vec2 pos = 2.0 * texCoord0 - vec2(1.0,1.0);
	OUT_POSITION = vec4(vTexCoord0.xy * 2.0 - 1.0, 0.0, 1.0);
	#ifdef RENDERTARGET_Y_DOWN
		pos.y = -pos.y;
	#endif
	OUT_POSITION.xy = pos;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );

	fPosition = mix(p, vec4(canvasPos, 0.0, 1.0), float(u2DMode));
}
