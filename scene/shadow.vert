uniform vec4	uFrustumCorners[8];
uniform mat4	uModelViewProjection;

BEGIN_PARAMS
	INPUT0(float,vIndex)
	
	OUTPUT0(vec4,fScreenCoord)
END_PARAMS
{
	vec4 p = uFrustumCorners[ int(vIndex) ];
	OUT_POSITION = fScreenCoord = mul( uModelViewProjection, p );
}