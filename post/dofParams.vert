USE_TEXTURE2D(tInput);

uniform vec4	uGridDimensions;	//{ w, h, 1/w, 1/h }
uniform vec4	uTextureDimensions;	//{ w, h, 1/w, 1/h }
uniform vec2	uBokehSize;
uniform vec4	uBokehRotation;		//{ x0, x1, y0, y1 }

uniform vec4	cQuadCorners[4];
uniform vec4	cOffsets[16];

struct	Bokeh
{
	vec4	color;
	vec2	corners[4];
	vec2	texcoords[4];
	vec2	pixelSize;
};

void	generateBokeh( out Bokeh b, vec3 color, vec2 ndcPos, float CoC, bool coversGroup )
{
	vec2 size = CoC * uBokehSize;
	b.pixelSize = size * uTextureDimensions.xy;

	float areaPixels = b.pixelSize.x * b.pixelSize.y;
	b.color.a = rcp( areaPixels );
	b.color.rgb = color * b.color.a;
	
	if( coversGroup )
	{ b.color *= 16.0; }
	
	if( uBokehSize.y >= 0.0 )
	{
		//near field should fade as bokeh size shrinks
		b.color *= saturate( (1.0/2.0)*b.pixelSize.y - 1.0 );
	}

	HINT_UNROLL
	for( int i=0; i<4; ++i )
	{
		vec4 o = cQuadCorners[i];
		b.corners[i] = ndcPos + size*(o.x*uBokehRotation.xy + o.y*uBokehRotation.zw);
		b.texcoords[i] = o.zw;
	}
}

#define	MIN_BOKEH_SIZE	2.0
