#ifndef MAT_REMAP_FRAG
#define MAT_REMAP_FRAG

#include "data/shader/common/util.sh"

#define MAT_DEFAULT_ETA		(1.0/1.5)		//glass (F0 = 0.04)
#define MAT_MAXIMUM_ETA		(1.0/1.01)		//slightly less than 1.0 so that half vectors stay defined upon refraction
#define MAT_MINIMUM_ETA		(1.0/5.0)		//eta given max (reasonable) IOR of 5.0

float remapLinearToEta( float s )
{
	//vacuum to diamond
	return mix( MAT_MAXIMUM_ETA, 1.0/2.4, saturate( s ) );
}

float remapReflectivityToEta( float F0 )
{
	float F0r = sqrt( saturate( F0 ) );
	return min( ( 1.0 - F0r ) * rcp( 1.0 + F0r ), MAT_MAXIMUM_ETA );
}

float remapReflectivityToIOR( float F0 )
{
	float F0r = sqrt( saturate( F0 ) );
	return min( ( 1.0 + F0r ) * rcp( 1.0 - F0r ), 5.0 );
}

float remapReflectivityToMetalness( float F0 )
{
	//anything <= 0.04 (IOR=1.5) is considered not metal
	return saturate( F0 - 0.04 ) * (1.0/0.96);
}

float remapEtaToReflectivity( float eta )
{
	float n = eta - 1.0;
	float d = eta + 1.0;
	return saturate( n*n * rcp( d*d ) );
}

float remapIORToReflectivity( float IOR )
{
	float F0r = (1.0 - IOR) * rcp(1.0 + IOR);
	return saturate( F0r*F0r );
}

float remapIORToEta( float IOR, float mediumIOR )
{
	return min( mediumIOR * rcp( IOR ), MAT_MAXIMUM_ETA );
}

#endif
