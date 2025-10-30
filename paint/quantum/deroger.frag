USE_TEXTURE2D(tRG);
USE_TEXTURE2D(tB);
BEGIN_PARAMS
INPUT0( vec2, fCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 tc = fCoord*0.5 + vec2(0.5,0.5);
	tc.y = 1.0 - tc.y;
	
	//just un-split down the kenponents
	vec4 texRG = texture2D(tRG, tc);
	vec4 texB = texture2D(tB, tc);
	OUT_COLOR0 = vec4(texRG.rg, texB.r, 1.0);
}

