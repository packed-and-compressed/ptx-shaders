USE_TEXTURE2D( tFillMask );
uniform vec2 uDTex;

void addSample(vec2 coord, float weight, inout float totalWeight, inout float totalSample)
{
	float v = texture2D(tFillMask, vec2(coord.x, 1.0-coord.y)).x;
	if(v > 0.0)
	{
		totalWeight += weight;
		totalSample += v * weight;
	}
}

BEGIN_PARAMS
	INPUT0(vec2,fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float mask = texture2D(tFillMask, vec2(fCoord.x, 1.0-fCoord.y)).x;
	
	//simple blur, but exclude anything fully black

	{
		float totalSample = 0.0;
		float totalWeight = 0.0;
		float cornerWeight = 0.0903;
		float sideWeight = 0.1277;
		float centerWeight = sideWeight;
		
		addSample(fCoord + uDTex * vec2(1.0, 1.0), cornerWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(-1.0, 1.0), cornerWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(-1.0, -1.0), cornerWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(1.0, -1.0), cornerWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(1.0, 0.0), sideWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(-1.0, 0.0), sideWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(0.0, -1.0), sideWeight, totalWeight, totalSample);
		addSample(fCoord + uDTex * vec2(0.0, 1.0), sideWeight, totalWeight, totalSample);
		
		//mix with the center value to a total weight of 1
		mask = mix(totalSample / max(totalWeight, 0.000001), mask, 1.0-totalWeight); 
		
	}
	
	OUT_COLOR0 = vec4(mask, mask, mask, mask);
}
