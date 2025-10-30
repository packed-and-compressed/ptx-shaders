#include "intersectionData.frag"
#include "dither.frag"

uniform vec4	uPassClearColor;
uniform uint	uDither;

HINT_EARLYDEPTHSTENCIL
BEGIN_PARAMS
	INPUT0(vec3,fPosition)
	INPUT1(vec3,fTangent)
	INPUT2(vec3,fBitangent)
	INPUT3(vec3,fNormal)
	INPUT4(vec2,fTexCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	uint2 pixelCoord = uint2( IN_POSITION.xy );
	vec2 packedHit = loadPackedHit( pixelCoord ).xy;

	//load high poly mesh intersection data
	BakeHit h;
	bool didhit = loadIntersection( h, pixelCoord, packedHit );
	
	//dst mesh values
	h.dstPosition = fPosition;
	h.dstPixelCoord = pixelCoord;
	h.dstTexCoord = fTexCoord;
	h.dstTangent = fTangent;
	h.dstBitangent = fBitangent;
	h.dstNormal = fNormal;

	//default color
	h.output0 = uPassClearColor;

	HINT_BRANCH
	if( didhit )
	{
		//run intersection routine
		h.output0.a = 1.0;
		#ifdef Intersection
			Intersection( h );
		#endif
	}
	else if( h.rayWasSent )
	{
		//the ray missed
		#ifdef Miss
			Miss( h );
		#endif
	}

	vec4 final = h.output0;

	if( uDither )
	{ final.rgb = dither8bit( final.rgb, pixelCoord ); }

	OUT_COLOR0 = final;
}
