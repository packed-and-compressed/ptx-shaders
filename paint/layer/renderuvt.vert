#include "../../common/util.sh"

	uniform vec2 uMeshTexCoord0Offsets;
	uniform int2 uUDIMTile;

	BEGIN_PARAMS
		INPUT0(vec3,vPosition)
		INPUT1(vec4,vTangent)
		INPUT2(vec3,vNormal)
		INPUT3(vec2,vTexCoord0)
		INPUT4(vec2,vTexCoord1)
		INPUT5(vec4,vColor)

		OUTPUT0(vec2,fTexCoord)
	END_PARAMS
	{
		vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );

		#ifdef TILE_MODE_UDIM
			vec2 pos = 2.0 * ( texCoord0 - vec2( uUDIMTile ) ) - vec2(1.0,1.0);
		#else
			vec2 pos = 2.0 * texCoord0 - vec2(1.0,1.0);
		#endif
		
		#ifdef RENDERTARGET_Y_DOWN
			pos.y = -pos.y;
		#endif
		OUT_POSITION.xy = pos;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );	

		#ifdef TILE_MODE_MTS
			fTexCoord = texCoord0.xy +  vec2( uUDIMTile );
		#else
			fTexCoord = texCoord0.xy;
		#endif

	}

