uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform vec4 uVerts[4];
BEGIN_PARAMS
	INPUT0(float,vAttribIndex)
	OUTPUT0(vec2,fTexCoord)
END_PARAMS {
	vec4 pos = uVerts[ int(vAttribIndex) ];
	fTexCoord = pos.zw;
	pos.zw = vec2( 0.0, 1.0 );
	OUT_POSITION = mul( uViewProjection, mul( uModel, pos ) );
}
