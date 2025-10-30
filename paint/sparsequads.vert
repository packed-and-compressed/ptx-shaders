uniform int uInvertSparseMap;
#ifdef SPARSE_LOAD_STORE
USE_LOADSTORE_TEXTURE2D(float, uSparseness, 2);
#else
USE_TEXTURE2D(tSparseMap);
#endif
uniform int uSparseRefValue;
BEGIN_PARAMS
	INPUT_VERTEXID(vertID)
	OUTPUT0(vec2, fCoord)
END_PARAMS
{
	vec4 scaleBias = vec4(1.0, 1.0, 0.0, 0.0);;
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
#ifdef SPARSE_LOAD_STORE
	vec4 sparseData = imageLoad(uSparseness, uint2(sectorX, (uInvertSparseMap == 0) ? SPARSE_BUFFER_SIZE-1-sectorY : sectorY));
#else
	vec4 sparseData = imageLoad(tSparseMap, uint2(sectorX, (uInvertSparseMap == 0) ? SPARSE_BUFFER_SIZE-1-sectorY : sectorY));
#endif
	fCoord.xy = blit.xy + pos.xy * blit.zw;;
	//flip raster position so that all rendered results are upside down
	#ifdef RENDERTARGET_Y_DOWN
		scaleBias.w = -scaleBias.w;
		fCoord.xy = blit.xy + pos.xy * ( vec2( blit.z, -blit.w ) );
		fCoord.y = 1.0 - blit.w - fCoord.y;
		pos.y = 1.0 - pos.y;
	#else
	#endif
	pos = 2.0 * (blit.xy + blit.zw * pos) - vec2(1.0,1.0);
	pos = (pos * scaleBias.xy) + scaleBias.zw;

	OUT_POSITION.xy = pos;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
	if((int)(sparseData.x*255.0) != uSparseRefValue)  //discard the tri if not inside the sparseness area
	{ OUT_POSITION.z = 99.0; }
}
