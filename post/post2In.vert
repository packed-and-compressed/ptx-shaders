uniform vec4	uPositions[4];
uniform vec4	uTexCoords[4];
uniform vec4	uInTexCoords[4];

BEGIN_PARAMS
	INPUT0(float,vID)

	OUTPUT0(vec2,fCoord)
	OUTPUT1(vec2,fInCoord)
END_PARAMS
{
	vec2 tcoord = uTexCoords[ int(vID) ].xy;
	vec2 tInCoord = uInTexCoords[ int(vID) ].xy;
	#ifdef RENDERTARGET_Y_DOWN
		tcoord.y = 1.0 - tcoord.y;
		tInCoord.y = 1.0 - tInCoord.y;
	#endif
	fCoord = tcoord;
	fInCoord = tInCoord;
	
	OUT_POSITION = uPositions[ int(vID) ];
}
