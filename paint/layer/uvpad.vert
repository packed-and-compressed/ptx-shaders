#include "../../common/util.sh"
uniform vec2 uUVOffset;
#ifdef GEO_PASS
	uniform vec2 uMeshTexCoord0Offsets;

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
		vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets ) + uUVOffset;
		vec2 pos = 2.0 * texCoord0 - vec2(1.0,1.0);
		#ifdef RENDERTARGET_Y_DOWN
			pos.y = -pos.y;
		#endif
		OUT_POSITION.xy = pos;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );	
		fTexCoord = texCoord0.xy;
	}
#else
	BEGIN_PARAMS
		INPUT_VERTEXID(vertID)
		OUTPUT0( vec2, fTexCoord )
	END_PARAMS
	{
		#ifdef RENDERTARGET_Y_DOWN
			vec2 pos = vec2(
				vertID == 2 ? 3.0 : -1.0,
				vertID == 1 ? -3.0 : 1.0 );
			OUT_POSITION.xy = pos;// + uUVOffset * 2.0;
			OUT_POSITION.zw = vec2( 0.5, 1.0 );
			fTexCoord.xy = abs(pos) - vec2(1.0, 1.0);
		#else
			vec2 pos = vec2(
				vertID == 1 ? 3.0 : -1.0,
				vertID == 2 ? 3.0 : -1.0 );
			OUT_POSITION.xy = pos + vec2(uUVOffset.x, -uUVOffset.y) * 2.0;
			OUT_POSITION.zw = vec2( 0.5, 1.0 );
			fTexCoord.xy = abs(pos) - vec2(1.0, 1.0);
		#endif
	}
#endif

