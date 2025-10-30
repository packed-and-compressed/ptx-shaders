#include "../../common/util.sh"
#include "../../common/tangentbasis.sh"

uniform vec4 uViewportScaleBias;

uniform vec2 uMeshTexCoord0Offsets;

#ifdef EFFECT_POSITIONAL	
	uniform mat4	uModelView;
	uniform mat4	uModelViewIT;
	uniform ivec2	uTileCoords;

	BEGIN_PARAMS
		INPUT0(vec3,vPosition)
		INPUT1(vec4,vTangent)
		INPUT2(vec3,vNormal)
		INPUT3(vec2,vTexCoord0)
		INPUT4(vec2,vTexCoord1)
		INPUT5(vec4,vColor)

		OUTPUT0(vec2,fBufferCoord)
		OUTPUT1(vec3,fPosition)
		OUTPUT3(vec3,fNormal)
		OUTPUT4(vec3,fTangent)
		OUTPUT5(vec3,fBitangent)
	END_PARAMS
	{
		vec4 scaleBias = uViewportScaleBias;
		vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );

		#if defined( EFFECT_POSITIONAL )
			texCoord0 -= vec2( uTileCoords );
		#endif

		vec2 pos = 2.0 * texCoord0 - vec2(1.0,1.0);
		#ifdef RENDERTARGET_Y_DOWN
			pos.y = -pos.y;
			scaleBias.w = -scaleBias.w;
		#endif
		
		OUT_POSITION.xy = (pos * scaleBias.xy) + scaleBias.zw;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );
	
		fPosition = vPosition;		
		fPosition = mulPoint( uModelView, fPosition ).xyz;	

		vec3 normal = decodeUint101010Normalized(vNormal);
		vec3 tangent = decodeUint101010Normalized(vTangent.xyz);
		vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

		fNormal = normalize( mulVec( uModelViewIT, normal ) );
		fTangent = normalize( mulVec( uModelViewIT, tangent ) );
		fBitangent = normalize( mulVec( uModelViewIT, bitangent ) );
		fBufferCoord = texCoord0.xy;
	}

#else
	BEGIN_PARAMS
		INPUT_VERTEXID(vertID)
		OUTPUT0( vec2, fBufferCoord )
	END_PARAMS
	{
		vec4 scaleBias = uViewportScaleBias;
		//flip raster position so that all rendered results are upside down
		#ifdef RENDERTARGET_Y_DOWN
			vec2 pos = vec2(
				vertID == 2 ? 3.0 : -1.0,
				vertID == 1 ? -3.0 : 1.0 );
			scaleBias.w = -scaleBias.w;	
		#else
			vec2 pos = vec2(
				vertID == 1 ? 3.0 : -1.0,
				vertID == 2 ? 3.0 : -1.0 );
		#endif
		fBufferCoord.xy = abs(pos) - vec2(1.0, 1.0);
		OUT_POSITION.xy = (pos*scaleBias.xy) + scaleBias.zw;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );		
	}

#endif

