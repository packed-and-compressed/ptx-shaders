#ifndef MSET_UDIM_H
#define MSET_UDIM_H

// This should match the corresponding constant in UDIM.h
#define UDIM_MAX_TILES_IN_SHAPE 256

bool calculateUDIMArrayOffset( vec2 texCoord, uint rows, uint cols, out uint arrayOffset )
{
	int2 tile = int2( floor( texCoord.xy ) );
	if( 0 <= tile.x && tile.x < int(cols) && 0 <= tile.y && tile.y < int(rows) )
	{
		arrayOffset = tile.y * cols + tile.x;
		return true;
	}

	arrayOffset = 0;
	return false;
}

#endif
