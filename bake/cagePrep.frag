HINT_EARLYDEPTHSTENCIL
BEGIN_PARAMS
	INPUT0(vec3,fPosition)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//We pack 3x32 position into 2x32 bits:
	// x = [ Px (21 bits)          | Py (11 bits) ]
	// y = [ Py (10 bits) |          Pz (22 bits) ]
	uint3 p = asuint( fPosition );
	uint2 packed;
	packed.x  = (p.x >> 11) << 11;
	packed.x |= (p.y >> 21);
	packed.y  = (p.y >> 11) << 22;
	packed.y |= (p.z >> 10);

	OUT_COLOR0.xy = asfloat( packed );
	OUT_COLOR0.zw = vec2( 0.0, 1.0 );
}
