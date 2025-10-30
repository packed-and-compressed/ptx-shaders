USE_TEXTURE2D(tCagePositions);

HINT_EARLYDEPTHSTENCIL
BEGIN_PARAMS
	INPUT0(vec3,fPosition)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//cage position is packed; see cagePrep.frag
	uint3 cagePosition;
	uint2 packedCagePos = asuint( imageLoad( tCagePositions, uint2(IN_POSITION.xy) ).xy );
	cagePosition.x = (packedCagePos.x >> 11) << 11;
	cagePosition.y = (packedCagePos.x << 21) | ((packedCagePos.y >> 22) << 11);
	cagePosition.z = (packedCagePos.y << 10);

	OUT_COLOR0.x = length( fPosition - asfloat(cagePosition) );
	OUT_COLOR0.yzw = vec3( 0, 0, 0 );
}
