#include "../../common/util.sh"
#include "../../common/tangentbasis.sh"

uniform vec4	uViewportScaleBias;
uniform vec4	uQuads[16];

#ifdef EFFECT_POSITIONAL
	uniform mat4	uModelView;
	uniform mat4	uModelViewIT;

	uniform vec2	uMeshTexCoord0Offsets;
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
		vec2 texCoord0 = decodeUVs( vTexCoord0, uMeshTexCoord0Offsets );

		vec4 scaleBias = uViewportScaleBias;

		vec2 pos = texCoord0;
		pos = 2.0 * pos - vec2(1.0,1.0);
		#ifdef RENDERTARGET_Y_DOWN
			pos.y = -pos.y;
			scaleBias.w = -scaleBias.w;
		#endif
		pos = (pos * scaleBias.xy) + scaleBias.zw;

		OUT_POSITION.xy = pos;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );

		fPosition		= vPosition;
		fBufferCoord	= texCoord0;
	
		fPosition = mulPoint( uModelView, fPosition ).xyz;	

		vec3 normal = decodeUint101010Normalized(vNormal);
		vec3 tangent = decodeUint101010Normalized(vTangent.xyz);
		vec3 bitangent = reconstructBitangent( tangent, normal, vTangent.w );

		fNormal = normalize( mulVec( uModelViewIT, normal ) );	
		fTangent = normalize( mulVec( uModelViewIT, tangent ) );
		fBitangent = normalize( mulVec( uModelViewIT, bitangent ) );
	}
#elif defined(PAINT_COMPOSITE)
	USE_TEXTURE2D(tSparseMap);
	uniform int uSparseRefValue;
	BEGIN_PARAMS
		INPUT_VERTEXID(vertID)
		OUTPUT0(vec2, fBufferCoord)
	END_PARAMS
	{
		vec4 scaleBias = uViewportScaleBias;
		// VID: position
		// 0 : ( 0, 0 )
		// 1 : ( 0, 1 )
		// 2 : ( 1, 1 )
		// 3 : ( 1, 1 )
		// 4 : ( 1, 0 )
		// 5 : ( 0, 0 )
		int sector = (vertID/6);
		int	 vID = vertID % 6;
		vec2 pos = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
							(vID == 0 || vID > 3) ? 0.0 : 1.0	);			
		int sectorX = sector % SPARSE_BUFFER_SIZE;
		int sectorY = sector / SPARSE_BUFFER_SIZE;
		vec4 blit = vec4((float)sectorX / (float)SPARSE_BUFFER_SIZE, (float)sectorY / (float)SPARSE_BUFFER_SIZE,
			1.0/(float)SPARSE_BUFFER_SIZE, 1.0/(float)SPARSE_BUFFER_SIZE);
		vec4 sparseData = imageLoad(tSparseMap, uint2(sectorX, SPARSE_BUFFER_SIZE-1-sectorY));
		
		fBufferCoord.xy = blit.xy + pos.xy * blit.zw;
		//flip raster position so that all rendered results are upside down
		#ifdef RENDERTARGET_Y_DOWN
			scaleBias.w = -scaleBias.w;
			fBufferCoord.xy = blit.xy + pos.xy * ( vec2( blit.z, -blit.w ) );
			fBufferCoord.y = 1.0 - blit.w - fBufferCoord.y;
			pos.y = 1.0 - pos.y;
		#else
		#endif
		pos = 2.0 * (blit.xy + blit.zw * pos) - vec2(1.0,1.0);
		pos = (pos * scaleBias.xy) + scaleBias.zw;

		OUT_POSITION.xy = pos;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );
		if((int)(sparseData.x*255.0) != uSparseRefValue)		//discard the tri if not inside the sparseness area
		{ OUT_POSITION.z = 99.0; }
	}
#else
	BEGIN_PARAMS
		INPUT_VERTEXID(vertID)
		OUTPUT0(vec2, fBufferCoord)
	END_PARAMS
	{		
		vec4 scaleBias = uViewportScaleBias;
		int vID = vertID%6;
		vec2 pos = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
							(vID == 0 || vID > 3) ? 0.0 : 1.0	);			
		vec4 blit = uQuads[vertID/6];
		fBufferCoord.xy = blit.xy + pos.xy * blit.zw;;
		//flip raster position so that all rendered results are upside down
		#ifdef RENDERTARGET_Y_DOWN
				scaleBias.w = -scaleBias.w;
				fBufferCoord.xy = blit.xy + pos.xy * (vec2(blit.z, -blit.w));
				fBufferCoord.y = 1.0 - blit.w - fBufferCoord.y;
				pos.y = 1.0 - pos.y;

		#else
		#endif
		pos = 2.0 * (blit.xy + blit.zw * pos) - vec2(1.0,1.0);
		pos = (pos * scaleBias.xy) + scaleBias.zw;

		OUT_POSITION.xy = pos;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );
	}
#endif
