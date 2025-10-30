#ifndef MSET_SAMPLE_COORD_H
#define MSET_SAMPLE_COORD_H

#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
#include "data/shader/common/projector.sh"
#endif

struct	SampleCoord
{
	vec4 					uvCoord;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	TriplanarProjector		projectorCoord;
	mat3x3					projectorToShadingRotation;
#endif
};

SampleCoord newSampleCoord()
{
	SampleCoord coord;
	
	coord.uvCoord = vec4( 0, 0, 0, 0 );
	#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
		coord.projectorCoord = newTriplanarProjector();
	#endif
	
	return coord;
}

#endif
