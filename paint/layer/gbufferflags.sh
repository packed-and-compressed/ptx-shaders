#ifndef GBUFFER_FLAGS
#define GBUFFER_FLAGS

//properties of gbuffer pixels, including blank entries

#define GBUFFER_FLAGS_GEOMETRY		1	//1 for geometry, 0 for the spaces between

#define GBUFFER_FLAGS_RASTER_PIXEL	4	//pixel lives on island or padded area
#define GBUFFER_FLAGS_ISLAND_PIXEL	8	//pixel lives on island
#define GBUFFER_FLAGS_SKIRT_PIXEL	16	//pixel lives on skirt, remote or fringe
#define GBUFFER_FLAGS_HEM_PIXEL		32	//skirt pixel touches other skirt
#define GBUFFER_FLAGS_DEAD_PIXEL	128	//pixel outside of max skirt range - ignore completely

#endif
