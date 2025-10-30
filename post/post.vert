uniform vec4	uPositions[4];
uniform vec4	uTexCoords[4];

BEGIN_PARAMS
	INPUT0(float,vID)
	OUTPUT0(vec2,fCoord)
END_PARAMS
{
	vec2 tcoord = uTexCoords[ int(vID) ].xy;
	#ifdef RENDERTARGET_Y_DOWN
		tcoord.y = 1.0 - tcoord.y;
	#endif
	fCoord = tcoord;
	OUT_POSITION = uPositions[ int(vID) ];
}