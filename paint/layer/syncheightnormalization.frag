#include "layerformat.sh"

float OrderedIntToFloat( int intVal )
{
	return asfloat( ( intVal >= 0 ) ? intVal : intVal ^ 0x7FFFFFFF );
}

USE_TEXTURE2D( tSourceTexture );
USE_RAWBUFFER( bHeightRange );

BEGIN_PARAMS
	INPUT0( vec2, fBufferCoord )
	OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	int minValueInt = asint( rawLoad( bHeightRange, 0 ) );
	int maxValueInt = asint( rawLoad( bHeightRange, 1 ) );
	float minValue = OrderedIntToFloat( minValueInt );
	float maxValue = OrderedIntToFloat( maxValueInt );

	float height = texture2DLod( tSourceTexture, fBufferCoord, 0.0 ).r;

	if( maxValueInt == minValueInt )
	{
		height = 0.5;
	}
	else
	{
		float divisor = maxValue - minValue;
		height = ( height - minValue ) / divisor;
	}

	OUT_COLOR0 = vec4( height, 0.0, 0.0, 0.0 );
}