#ifndef COLORMASK_SH
#define COLORMASK_SH

#if defined(__cplusplus)
namespace mset
{
using uint = unsigned;
#endif

#define sNotFoundColorId 0xFFFE
#define GRADIENT_TEXEL_SIZE 2
#define	sColorDiffThreshold 3
#define COLOR_MASK_OFFSETS 48  // kernel 7x7 except the center ==> 48 texels

#if defined(__cplusplus)
static void uncompressGradientTexelXY( uint XY, uint& X, uint& Y )
#else
void uncompressGradientTexelXY( uint XY, inout uint X, inout uint Y )
#endif
{
	X = XY & 0xFFFF;
	Y = ( XY >> 16 ) & 0xFFFF;
}

#if defined(__cplusplus)
static void compressGradientTexelXY( uint& XY, uint X, uint Y )
#else
void compressGradientTexelXY( inout uint XY, uint X, uint Y )
#endif
{ XY = ( Y << 16 ) + X; }

#if defined(__cplusplus)
static void uncompressGradientTexelColorsId( uint colorsId, int& colorId1, int& colorId2 )
#else
void uncompressGradientTexelColorsId( uint colorsId, inout int colorId1, inout int colorId2 )
#endif
{
	uint colorId1U = uint( colorsId & 0xFFFF );
	uint colorId2U = uint( ( colorsId >> 16 ) & 0xFFFF );

	colorId1 = ( colorId1U == sNotFoundColorId ? -1 : int( colorId1U ) );
	colorId2 = ( colorId2U == sNotFoundColorId ? -1 : int( colorId2U ) );
}

#if defined(__cplusplus)
static void compressGradientTexelColorsId( uint& colorsId, int colorId1, int colorId2 )
#else
void compressGradientTexelColorsId( inout uint colorsId, int colorId1, int colorId2 )
#endif
{
	uint colorId1U = ( colorId1 == -1 ? sNotFoundColorId : uint( colorId1 ) ) & 0xFFFF;
	uint colorId2U = ( colorId2 == -1 ? sNotFoundColorId : uint( colorId2 ) ) & 0xFFFF;

	colorsId = ( colorId2U << 16 ) + colorId1U;
}

struct GradientTexel
{
	#if defined(__cplusplus)
	GradientTexel() 
	{ 
		mXY = 0;
		compressColorsId( sNotFoundColorId, sNotFoundColorId );
	}

	void uncompressXY( unsigned& X, unsigned& Y ) const
	{ uncompressGradientTexelXY( mXY, X, Y ); }

	void compressXY( unsigned X, unsigned Y )
	{ compressGradientTexelXY( mXY, X, Y ); }

	void uncompressColorsId( int& colorId1, int& colorId2 ) const
	{ uncompressGradientTexelColorsId( mColorsId, colorId1, colorId2 ); }

	void compressColorsId( int colorId1, int colorId2 )
	{ compressGradientTexelColorsId( mColorsId, colorId1, colorId2 ); }
	#endif

	uint	mXY;
	uint	mColorsId;
};

#if defined(__cplusplus)
}
#endif

#endif //COLORMASK_SH
