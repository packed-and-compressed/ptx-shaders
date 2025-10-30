uniform vec4 uBlitRect;
uniform vec4 uTileTextureCoords; // default: ( startX: 0, endX: 1, startY: 0, endY: 1 )

BEGIN_PARAMS
	INPUT_VERTEXID(vID)

	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	vec2 coord = vec2(
		( vID < 2 || vID > 4 ) ? uTileTextureCoords.x : uTileTextureCoords.y,
		( vID < 1 || vID > 3 ) ? uTileTextureCoords.w : uTileTextureCoords.z
	);
	fCoord = coord;
	#ifdef RENDERTARGET_Y_DOWN
		fCoord.y = 1.0 - fCoord.y;
	#endif

	OUT_POSITION.xy = 2.0 * (uBlitRect.xy + uBlitRect.zw * coord) - vec2(1.0,1.0);
	OUT_POSITION.zw = vec2( 0.9999, 1.0 );
}