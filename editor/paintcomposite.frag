USE_TEXTURE2D(tInput);

uniform vec3	uColor;
uniform vec2	uInputRes; // { 1/w, 1/h }

BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	float s = texture2D( tInput, fCoord ).x;

	if( s <= 0.0 )
	{
		#define	NEIGHBOR(dx,dy)	{\
			float n = texture2D( tInput, fCoord + vec2(dx,dy)*uInputRes ).x;\
			if( n > s )\
			{ s = n; }\
		}

		NEIGHBOR(-1.0,-1.0);
		NEIGHBOR( 0.0,-1.0);
		NEIGHBOR( 1.0,-1.0);

		NEIGHBOR(-1.0, 0.0);
		NEIGHBOR( 1.0, 0.0);

		NEIGHBOR(-1.0, 1.0);
		NEIGHBOR( 0.0, 1.0);
		NEIGHBOR( 1.0, 1.0);
	}

	OUT_COLOR0.rgb = uColor;
	OUT_COLOR0.a = s;
}