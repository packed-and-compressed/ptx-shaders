#ifndef MSET_DILATION_PACK_FRAG
#define MSET_DILATION_PACK_FRAG

#define DILATION_SOLID		0x1

uint	packDilation( int2 offset, uint flags )
{
	//packs offsets in the range [-16384,16383], as 15 bit signed values.
	//flags are at most 2 (low) bits
	uint p;
	p = uint( offset.x + 16384 );
	p = (p << 15) | uint( offset.y + 16384 );
	p = (p << 2) | flags;
	return p;
}

int2	unpackDilationOffset( uint p )
{
	int2 offset;
	offset.y = int((p >>  2) & 0x7FFF) - 16384;
	offset.x = int(p >> 17) - 16384;
	return offset;
}

#endif
