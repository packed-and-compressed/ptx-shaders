USE_TEXTURE2D(tInput0);
USE_TEXTURE2D(tInput1);
USE_TEXTURE2D(tInput2);
USE_TEXTURE2D(tInput3);

uniform vec4	uWeights;

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec4 r;
	r  = uWeights.x*texture2D( tInput0, fCoord );
	r += uWeights.y*texture2D( tInput1, fCoord );
	r += uWeights.z*texture2D( tInput2, fCoord );
	r += uWeights.w*texture2D( tInput3, fCoord );
	OUT_COLOR0 = r;
}