

#include "padpixeltypes.sh"


#define useSampleUL 1
#define useSampleUR 2
#define useSampleLL 4
#define useSampleLR 8
#define useSampleTop 16
#define useSampleLeft 32
#define useSampleRight 64
#define useSampleBottom 128


struct ScatterSampler
{
	vec2 uv;//the starting coordinate
	vec2 directionV;//aligned vector in uv space matching local vec2(0,1)
	uint scatterFlags;//bitmask of valid neighbor samples
};

vec2 radiansToUnitVec2( float rad )
{
	return vec2(-sin( rad ), cos( rad ));
}

//0,1 (12:00) is the default axis, degrees go clockwise
//output is normalized 0-1
float packUnitVec2ToRotation( vec2 unitDir )
{
	float angle = acos(unitDir.y) * 57.29577951326093f;//convert to angles
	if( unitDir.x < 0 )
	{ angle = 360.0f - angle; }//make positive
	return angle/360;//make unit
}

uint packFloat8( float v )
{ return (uint)(v*255); }

uint packFloat16( float v )
{ return (uint)(v*65535); }

float unpackFloat8( uint v )
{ return ((float)v)/255; }

float unpackFloat16( uint v )
{ return ((float)v)/65535; }

uint packUint8sTo16( uint a, uint b )
{ return a | (b << 8); }

uint packUint16sTo32( uint a, uint b )
{ return a | (b << 16); }

void unpack16To8s( uint ivalue, inout uint a, inout uint b )
{
	a = ivalue & 0x000000FF;//upper bits ignored
	b = ivalue >> 8;
}

void unpack32To16s( uint ivalue, inout uint a, inout uint b )
{
	a = ivalue & 0x0000FFFF;//upper bits ignored
	b = ivalue >> 16;
}

vec4 packScatterSampler( ScatterSampler ss )
{
	vec4 result;
	uint scatterFlags8 = ss.scatterFlags;
	uint scatterMisc16 = packUint8sTo16(scatterFlags8,0);
	float direction32 = packUnitVec2ToRotation(ss.directionV);
	uint directionV16 = packFloat16(direction32);
	uint packedData32 = packUint16sTo32(scatterMisc16,directionV16);
	result.xy = ss.uv;
	result.z = asfloat(packedData32);
	result.w = 0.0;
	return result;
}

ScatterSampler unpackScatterSampler( vec4 v )
{
	ScatterSampler ss;
	uint packedData32 = asuint(v.z);
	uint scatterMisc16 = 0;
	uint directionV16 = 0;
	uint misc8 = 0;

	unpack32To16s( packedData32, scatterMisc16, directionV16 );
	unpack16To8s( scatterMisc16, ss.scatterFlags, misc8 );

	ss.uv = v.xy;
	ss.directionV =	radiansToUnitVec2( unpackFloat16(directionV16)*-6.28318530718f );//convert to -radians	

	return ss;
}

vec2 convertNormalMapXY( vec2 xy, vec2 H, vec2 V )
{
	vec2 nXY = (xy * 2.0) + vec2( -1.0, -1.0 );
	xy = nXY;

	float sn = V.x;
	float cs = V.y;
	float rx = (xy.x * cs) - (xy.y * sn);
	float ry = (xy.x * sn) + (xy.y * cs);
	xy.x = rx;
	xy.y = ry;

	xy = (xy * 0.5) + vec2( 0.5, 0.5 );
	return xy;
}
