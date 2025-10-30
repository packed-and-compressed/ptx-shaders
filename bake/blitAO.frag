uniform vec4	uClearColor;
uniform uint2	uCoordOffset;

USE_TEXTURE2D( tInput );

vec4	Unpack( float v )
{
	//unpacks float32 scalar, with alpha/hit signal in low bit
	uint i = asuint(v);
	if( i & 1 )
	{
		float ao = asfloat( i & ~uint(1) );
		return vec4( ao,ao,ao, 1.0 );
	}
	return uClearColor;
}

BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	uint2 pixelCoord = uint2(IN_POSITION.xy) - uCoordOffset;

	float ld = imageLoad( tInput, pixelCoord ).x;
	OUT_COLOR0 = Unpack(ld);
}