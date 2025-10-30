uniform vec4 uControl;	//x,y,w,h
uniform vec2 uViewport;	//w,h

BEGIN_PARAMS
INPUT_VERTEXID(vertID)
OUTPUT0(vec2, fBufferCoord)
END_PARAMS
{
	vec2 pos = fBufferCoord = vec2( vertID == 1 ? 3.0 : -1.0, vertID == 2 ? 3.0 : -1.0 );
	OUT_POSITION.xy = pos;
	OUT_POSITION.zw = vec2( 0.5, 1.0 );
}

