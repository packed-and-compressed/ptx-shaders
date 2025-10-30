BEGIN_PARAMS
	INPUT_VERTEXID(VertexID)

	OUTPUT0(vec2,Texture)
END_PARAMS
{
	// Triangle list
	// Draw(3)
	
    Texture = vec2( ( VertexID << 1 ) & 2, VertexID & 2 );
	OUT_POSITION = vec4( Texture.x * 2.0f - 1.0f, -Texture.y * 2.0f + 1.0f, 0.0f, 1.0f );
}
