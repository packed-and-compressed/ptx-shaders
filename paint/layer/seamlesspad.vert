BEGIN_PARAMS
	INPUT_VERTEXID(vertID)
	OUTPUT0( vec2, fTexCoord )
END_PARAMS
{
	#ifdef RENDERTARGET_Y_DOWN
		vec2 pos = vec2(
			vertID == 2 ? 3.0 : -1.0,
			vertID == 1 ? -3.0 : 1.0 );
	#else
		vec2 pos = vec2(
			vertID == 1 ? 3.0 : -1.0,
			vertID == 2 ? 3.0 : -1.0 );
	#endif
		OUT_POSITION.xy = pos;
		OUT_POSITION.zw = vec2( 0.5, 1.0 );
		fTexCoord.xy = abs(pos) - vec2(1.0, 1.0);
}

