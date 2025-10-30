BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fCoord)
END_PARAMS
{
	OUT_POSITION.xy = fCoord = vec2( vertID == 1 ? 3.0 : -1.0, vertID == 2 ? 3.0 : -1.0 );
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}

