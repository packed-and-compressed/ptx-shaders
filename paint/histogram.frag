uniform int		uHistogramR[256];
uniform int		uHistogramG[256];
uniform int		uHistogramB[256];
uniform int		uHistogramA[256];
uniform vec4	uHistogramScale;
uniform vec4	uHistogramColor;
uniform float	uBottomClipping;	//prevents the histogram from "riding up" when it's fully visible due to scrolling
BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 tc = fBufferCoord*0.5 + vec2(0.5,0.5);
	tc.y -= uBottomClipping;
	
	int x = int(floor(tc.x * 256.0));
	x = max(0, min(255, x));
	vec4 percent = vec4( 
		float(uHistogramR[x]) * uHistogramScale.r,
		float(uHistogramG[x]) * uHistogramScale.g,
		float(uHistogramB[x]) * uHistogramScale.b,
		float(uHistogramA[x]) * uHistogramScale.a
	);	
	percent = pow( percent, 0.5);
	
	float maxmax = max(percent.r, max(percent.g, max(percent.b, percent.a)));

	vec4 color;
	color.r = tc.y < percent.r ?	uHistogramColor.r : 0.0;
	color.g = tc.y < percent.g ?	uHistogramColor.g : 0.0;
	color.b = tc.y < percent.b ?	uHistogramColor.b : 0.0;
	color.a = tc.y < maxmax ?		uHistogramColor.a : 0.0;
	
	if( tc.y < percent.a ) 
	{
		color.rgb += uHistogramColor.rgb * vec3(1.0,1.0,0.0);
	}

	color.rgb *= color.a;
	OUT_COLOR0 = color;
}

