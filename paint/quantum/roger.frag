USE_TEXTURE2D(tInput);

BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec2 )
OUTPUT_COLOR1( float )
END_PARAMS
{
	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	
	//just split up the kenponents
	vec4 tex = texture2D(tInput, tc);
	OUT_COLOR0.rg = tex.rg;
	OUT_COLOR1 = tex.b;
}

