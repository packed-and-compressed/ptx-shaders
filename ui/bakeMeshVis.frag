USE_TEXTURE2D(tOffsetMask2);

uniform vec4	uBrushMarker;	// { u, v, size, sharpness }
uniform vec3	uColor0, uColor1;
uniform float	uAlpha;
uniform int		uPaintMode;
uniform uint	uUDIMMode;
uniform int2	uUDIMTile;

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	INPUT1(vec3,fBrushCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	//do actually need to discard out of bounds, for udims
	int2 tile = int2( floor( fTexCoord ) );
	if( uUDIMMode && (tile.x != uUDIMTile.x || tile.y != uUDIMTile.y) )
	{
		discard;
	}

	vec2 texCoord = uUDIMMode ? fTexCoord : frac(fTexCoord);

	float offsetMask = texture2D( tOffsetMask2, frac( fTexCoord ) ).x;
	OUT_COLOR0.rgb = mix( uColor0, uColor1, sqrt(offsetMask) );
	OUT_COLOR0.a = IN_FRONTFACING ? uAlpha : 0.2*uAlpha;
	OUT_COLOR0.rgb *= OUT_COLOR0.a;

	float feather = 0.0;
	if( uPaintMode == 1 )
	{
		//3d brush painting
		feather = 1.0 - saturate(length(fBrushCoord));
	}
	else if( uPaintMode == 0 )
	{
		//uv painting
		vec2 brushPos = uUDIMMode ? uBrushMarker.xy : frac(uBrushMarker.xy);
		feather = 1.0 - min( length(texCoord-brushPos)/uBrushMarker.z, 1.0 );
	}

	vec4 col = mix( vec4( 0.0, 0.0, 0.0, 0.0 ), vec4( 0.33, 0.43, 0.85, 0.75 ), pow( feather, (2.0+1.0e-6) - 2.0 ) );
	const vec4 brushOutline = vec4( 0.137, 0.427, 0.976, 1.0 );
	const float t0 = 1.0 - smoothstep( 0.0, 0.05, abs( feather ) );
	const float t1 = 1.0 - smoothstep( 0.0, 0.025, abs( feather - ( 1.0 - uBrushMarker.w ) ) );
	for (int i = 0; i < 4; ++i)
	{
		col = mix( col, brushOutline, t0 );
		col = mix( col, brushOutline, t1 );
	}

	feather = pow( feather, (2.0+1.0e-6) - 2.0 );
	OUT_COLOR0 = mix( OUT_COLOR0, col, feather );
}