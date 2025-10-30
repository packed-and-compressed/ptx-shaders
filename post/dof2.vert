#include "dofParams.vert"

//turns out this is WAY faster than just doing a[i]; dynamic indexing of registers must be slowww
#define	INDEX4(a,i)		(i==0 ? a[0] : (i==1 ? a[1] : (i==2 ? a[2] : a[3])))

//fallback for dof.vert/dof.geom, for systems that don't have geometry shaders
BEGIN_PARAMS
	INPUT_VERTEXID(vVertex)

	OUTPUT0(vec4,fColor)
	OUTPUT1(vec2,fCoord)
END_PARAMS
{
	//primitive and corner index
	uint primitive = vVertex / 6;
	uint corner = vVertex - primitive*6;
	if( corner == 4 )
	{ corner = 2; }
	else if( corner == 5 )
	{ corner = 1; }
	
	//find texcoord and screen position
	vec2 tc, pos, groupTexCoord, groupPos;
	bool leader;
	{
		uint2 pixelCoords;
		pixelCoords.y = (primitive / uint(uGridDimensions.x));
		pixelCoords.x = primitive - pixelCoords.y * uint(uGridDimensions.x);
		uint2 groupLocal = pixelCoords & uint2(3,3);

		leader = (groupLocal.x == 0 && groupLocal.y == 0);
		groupTexCoord = (vec2(pixelCoords) - vec2(groupLocal) + vec2(2.0,2.0)) * uGridDimensions.zw;
		tc = (vec2(pixelCoords) + vec2(0.5,0.5)) * uGridDimensions.zw;

		pos = 2.0*tc - vec2(1.0,1.0);
		groupPos = 2.0*groupTexCoord - vec2(1.0,1.0);
		#ifdef RENDERTARGET_Y_DOWN
			tc.y = 1.0 - tc.y;
			groupTexCoord.y = 1.0 - groupTexCoord.y;
		#endif
	}

	//find CoC neighborhood
	float minCoC = 1.0e9, maxCoC = -1.0e9;
	for( int i=0; i<4; ++i )
	{
		vec4 c = abs( textureGatherAlpha( tInput, groupTexCoord + cOffsets[i].xy*uTextureDimensions.zw ) );
		minCoC = min( minCoC, min( min( min( c.x, c.y ), c.z ), c.w ) );
		maxCoC = max( maxCoC, max( max( max( c.x, c.y ), c.z ), c.w ) );
	}
	bool mergeGroup = (maxCoC-minCoC) < 0.04 * maxCoC;
	mergeGroup = mergeGroup && (abs(maxCoC * uBokehSize.x * uTextureDimensions.x) > 28.0);

	if( mergeGroup && !leader )
	{
		//discard this quad, group leader will cover this area
		fColor = vec4(0.0,0.0,0.0,0.0);
		fCoord = vec2(0.0,0.0);
		OUT_POSITION = vec4(-8.0,-8.0,0.0,1.0);
		return;
	}

	//sample image
	vec4 samp;
	if( mergeGroup )
	{
		samp  = 0.25 * texture2DLod( tInput, groupTexCoord + vec2( 1.0, 1.0)*uTextureDimensions.zw, 0.0 );
		samp += 0.25 * texture2DLod( tInput, groupTexCoord + vec2(-1.0, 1.0)*uTextureDimensions.zw, 0.0 );
		samp += 0.25 * texture2DLod( tInput, groupTexCoord + vec2(-1.0,-1.0)*uTextureDimensions.zw, 0.0 );
		samp += 0.25 * texture2DLod( tInput, groupTexCoord + vec2( 1.0,-1.0)*uTextureDimensions.zw, 0.0 );
	}
	else
	{
		samp = texture2DLod( tInput, tc, 0.0 );
	}

	//make a bokeh out of it
	Bokeh bk;
	generateBokeh( bk, samp.xyz, mergeGroup ? groupPos : pos, samp.a, mergeGroup );
	
	//outputs
	fColor = bk.color;
	fCoord = INDEX4(bk.texcoords,corner);
	if( bk.pixelSize.y >= MIN_BOKEH_SIZE )
	{
		OUT_POSITION.xy = INDEX4(bk.corners,corner);
	}
	else
	{
		OUT_POSITION.xy = vec2(-8.0,-8.0);
	}
	OUT_POSITION.zw = vec2(0.5,1.0);
}
