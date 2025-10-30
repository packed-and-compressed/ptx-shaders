USE_TEXTURE2D( tSpecularFeature );

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	const float rayDist = texture2D( tSpecularFeature, fCoord ).r;
	const float rayDistFWidth = max( abs( ddx( rayDist ) ), abs( ddy( rayDist ) ) );
	OUT_COLOR0 = vec4( rayDistFWidth, 0, 0, 0 );
}
