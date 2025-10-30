
//metal compiler fails with unknown error if 
#ifdef CPR_METAL
const float multTable[16] = {0.0, 1.0, 2.0, 3.2,
 4.0, 5.3, 6.4, 8.0,
 9.6, 10.2, 11.4, 12.8,
13.6, 14.4, 15.2, 16.0};
#endif

float getMult(int i)
{
//	return float(i)/16.0;
//do we need HDR values?  numerical testing could give us the answer
#ifndef CPR_METAL
const float multTable[16] = {0.0, 1.0, 2.0, 3.2,
 4.0, 5.3, 6.4, 8.0,
 9.6, 10.2, 11.4, 12.8,
13.6, 14.4, 15.2, 16.0};
#endif
	
	return multTable[i]/16.0;
}


//given several known points in the response function, and assuming it's
//piecewise dual-linear, locate the "elbow"
vec2 calcElbowSimple(float y1, vec2 p2, vec2 p3, float y4)
{
	float x1 = 0.0;
	float x4 = 1.0;
	float x2 = p2.x;
	float y2 = p2.y;
	float x3 = p3.x;
	float y3 = p3.y;
	//I could do the vector math, but I like Wikipedia's equation better....
	float px = ((x1*y2 - y1*x2) * (x3-x4) - (x1-x2) * (x3*y4 - y3*x4)) / ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
	float py = ((x1*y2 - y1*x2) * (y3-y4) - (y1-y2) * (x3*y4 - y3*x4)) / ((x1-x2)*(y3-y4)-(y1-y2)*(x3-x4));
	return vec2(px, py);
/*	float m1 = (p1.y-y0)/p1.x;
	vec2 dir1 = normalize(vec2(0.0, y0)-p1);
	vec2 dir2 = normalize(vec2(1.0, yf)-p3);
	vec2 p31 = p3-p1;
	vec2 perp2 = vec2(-dir2.y, dir2.x);
	float d2 = dot(dir1, perp2);
	float perpDist = dot(p31, perp2);
	vec2 elbow = p1 + dir1 * perpDist / d2;
	return elbow; 
*/
}

float fElbow(float y1, vec2 elbow, float yf, float t)
{
	float yFirst = mix(y1, elbow.y, t / elbow.x);
	float ySecond = mix(elbow.y, yf, (t-elbow.x)/(1.0-elbow.x));
	return mix(yFirst, ySecond, step(elbow.x, t));
}

uint iMod(uint m, int o)
{
	return uint(ceil(mod(float(m), float(o))));
}

//limit the number to a certain number of bits
uint bitSnip(uint input, int numBits)
{
	return iMod(input, int(pow(2.0, float(numBits))));
}

uint encodeUint(uint input, int startBit, int numBits)
{
	input = bitSnip(input, numBits);
	input *= int(pow(2.0, float(startBit)));
	return input;
}

uint extractUint(uint input, int startBit, int numBits)
{
	input /= int(pow(2.0, float(startBit)));
	input = bitSnip(input, numBits);
	return input;
}

uint encodeFloat(float input, int startBit, int numBits)
{
	uint i = uint(input * (pow(2.0, float(numBits))-1.0));
	i *= int(pow(2.0, float(startBit)));
	return i;
}

float extractFloat(uint input, int startBit, int numBits)
{
	input /= int(pow(2.0, float(startBit)));
	input = bitSnip(input, numBits);
	return float(input)/(pow(2.0, float(numBits))-1);
}


//evaluate a response curve given our raw integer inputs
float evaluateChannel(int v0, int vData, int v1, float t)
{
	//let's start with the elbow method
	float y0 = extractFloat(v0, 0, 8);
	float elbowX = extractFloat(vData, 0, 8);
	float elbowY = extractFloat(vData, 8, 8);
	float yf = extractFloat(v1, 0, 8);
	return fElbow(y0, vec2(elbowX, elbowY), yf, t);
	
}

//debugging frunctions

float f1(float t)
{
	return sin(t * 3.14159/2.0);
}

float f2(float t)
{
	return clamp(0.5 + t * t, 0.0, 1.0);
}

float f3(float t)
{
	return pow(t, 0.2);
}


