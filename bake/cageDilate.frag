USE_TEXTURE2D( tInput );

uniform vec2	uDstPixelSize;

void	sampleNeighbor( vec2 c, vec2 offset, inout float sum, inout float weightSum )
{
	vec2 s = texture2DLod( tInput, c + uDstPixelSize*offset, 0.0 ).xy;
	if( s.y > 0.0 )
	{
		sum += s.x;
		weightSum += 1.0;
	}
}

BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
	INPUT0(vec2,fCoord)
END_PARAMS
{
	vec2 coord = fCoord;
	coord.y = 1.0 - coord.y;

	vec2 r = texture2DLod( tInput, coord, 0.0 ).xy;
	float final = r.x;
	if( r.y <= 0.0 )
	{
		//sample neighbors
		float sum = 0.0;
		float weight = 0.0;

		sampleNeighbor( coord, vec2(-1,-1), sum, weight );
		sampleNeighbor( coord, vec2(-1, 0), sum, weight );
		sampleNeighbor( coord, vec2(-1, 1), sum, weight );
		sampleNeighbor( coord, vec2( 0,-1), sum, weight );
		
		sampleNeighbor( coord, vec2( 0, 1), sum, weight );
		sampleNeighbor( coord, vec2( 1,-1), sum, weight );
		sampleNeighbor( coord, vec2( 1, 0), sum, weight );
		sampleNeighbor( coord, vec2( 1, 1), sum, weight );

		if( weight > 0.0 )
		{
			final = sum / weight;
		}
	}

	OUT_COLOR0 = vec4( final, 0, 0, 1 );
}