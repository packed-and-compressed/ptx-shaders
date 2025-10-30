#include "dofParams.vert"

BEGIN_INPUTS
END_INPUTS

BEGIN_OUTPUTS
    OUTPUT0(vec4,fColor)
    OUTPUT1(vec2,fCoord)
END_OUTPUTS

GEOMETRY( POINTS_IN, TRIANGLES_OUT, 64 )
{
	//determine screen position & screen texcoord [0,1]
	vec2 tc;
	tc.x = mod( float(PRIMITIVE_ID), uGridDimensions.x );
	tc.y = floor( float(PRIMITIVE_ID) * uGridDimensions.z );
	tc *= uGridDimensions.zw;
	tc += uGridDimensions.zw * 0.5;
	vec2 pos = 2.0*tc - vec2(1.0,1.0);
	#ifdef RENDERTARGET_Y_DOWN
		tc.y = 1.0 - tc.y;
	#endif

	//sample screen color and CoC for each pixel in our 4x4 block
	vec4 samples[16];
	vec4 sampleMin = vec4(1.0e12, 1.0e12, 1.0e12, 1.0e12);
	vec4 sampleMax = -sampleMin;
	vec4 sampleSum = vec4(0.0,0.0,0.0,0.0);
	HINT_UNROLL
	for( int s=0; s<16; ++s )
	{
		samples[s] = texture2DLod( tInput, tc + cOffsets[s].zw*uTextureDimensions.zw, 0.0 );
		sampleMin = min( samples[s], sampleMin );
		sampleMax = max( samples[s], sampleMax );
		sampleSum += samples[s];
	}

	//criterion: range of CoC values
	vec4 variance = sampleMax - sampleMin;
	bool lowCoCVariance = abs(variance.w) < 0.04 * abs(sampleMax.w);

	//criterion: bokeh size
	float bokehMinSize = abs(sampleMin.w) * abs(uBokehSize.y) * uTextureDimensions.y;
	bool largeBokeh = bokehMinSize > 28.0;

	//criterion: range of color values
	//threshold varies with bokeh size somewhat, so that larger bokeh require
	//high color variance in order to 'split'
	float maxColorVariance = max( max( variance.x, variance.y ), variance.z );
	float colorThreshold = (1.0/30.0) * bokehMinSize;
	colorThreshold *= colorThreshold;
	bool lowColorVariance = maxColorVariance < 0.5 * colorThreshold;
	
	HINT_BRANCH
	if( lowColorVariance && lowCoCVariance && largeBokeh )
	{
		//generate 1 quad from all sample pixels (pixels are similar enough)
		sampleSum *= (1.0/16.0);
		Bokeh bk;
		generateBokeh( bk, sampleSum.xyz, pos, sampleSum.w, true );
		HINT_BRANCH
		if( bk.pixelSize.y >= MIN_BOKEH_SIZE )
		{
			OUT(fColor) = bk.color;
			OUT_POSITION.zw = vec2( 0.5, 1.0 );

			HINT_UNROLL
			for( int i=0; i<4; ++i )
			{
				OUT_POSITION.xy = bk.corners[i];
				OUT(fCoord) = bk.texcoords[i];
				EMIT_VERTEX;
			}
			END_PRIMITIVE;
		}
	}
	else
	{
		//generate 16 quads from the various samples
		HINT_UNROLL
		for( int q=0; q<16; ++q )
		{
			Bokeh bk;
			generateBokeh(	bk,
							samples[q].xyz,
							pos + cOffsets[q].xy*uTextureDimensions.zw,
							samples[q].w,
							false );
			HINT_BRANCH
			if( bk.pixelSize.y >= MIN_BOKEH_SIZE )
			{
				OUT(fColor) = bk.color;
				OUT_POSITION.zw = vec2( 0.5, 1.0 );

				HINT_UNROLL
				for( int i=0; i<4; ++i )
				{
					OUT_POSITION.xy = bk.corners[i];
					OUT(fCoord) = bk.texcoords[i];
					EMIT_VERTEX;
				}
				END_PRIMITIVE;
			}
		}
	}
	
}
