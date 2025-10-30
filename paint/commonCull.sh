
//brush edge falloff
float fallOff(in float t, in float FOStart, in float FODistance)
{
	float f = saturate(1.0-(t - FOStart) / FODistance);
	//float fallOffPower = 2.0;
	return (sin(f*f * 3.1459 - 1.5708)+1.0)/2.0;
}

float angleFalloff(float dotProduct, float maxDot, float falloffAmount)
{
	maxDot = 0.5 - 0.5*maxDot;		//make maxangle go from 0 to 1
	float inDot = 0.5 - 0.5 * dotProduct;	//make input go from 0 to 1
	float window = (falloffAmount) * maxDot;
	float t = saturate((inDot - maxDot+window) / (max(window, 0.001)));
	return 0.5+0.5*cos(t*3.14159);
}

