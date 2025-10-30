uniform vec4 uPosAndSize;

BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fCoord)
END_PARAMS
{
	int vertexID = vertID;
	fCoord = vec2(	(vertexID > 1 && vertexID != 5) ? 1.0 : 0.0,
					(vertexID == 0 || vertexID > 3) ? 1.0 : 0.0	);

	OUT_POSITION.zw = vec2( 0.5, 1.0 );
//	fCoord = fCoord / 2.0 + 0.5;
	OUT_POSITION.xy = uPosAndSize.xy * 2.0 + fCoord.xy * uPosAndSize.zw * 2.0 - 1.0;
}

