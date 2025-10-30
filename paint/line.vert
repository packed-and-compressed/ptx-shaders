#include "../common/util.sh"

uniform mat4	uModelMatrix;
uniform vec3	uP1;
uniform vec3	uP2;
uniform mat4	uViewProjectionMatrix;
uniform vec4	uColor;
uniform int 	uVPWidth;
uniform int		uVPHeight;
uniform float	uLineWidth;
uniform float	uLength;
BEGIN_PARAMS
	INPUT_VERTEXID(vID)
	OUTPUT0(vec4,fColor)
END_PARAMS
{
	vec4 p1 = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, uP1).xyz);
	vec4 p2 = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, uP2).xyz);
	float l = 1.0;
	vec4 dir = (p2-p1);

	vec3 pixelDir = dir.xyz;
	pixelDir.x *= float(uVPWidth);
	pixelDir.y *= float(uVPHeight);
	
	//if we're given a pixel length, short then the line to that.  It doesn't work perfectly.
	float dirLength = length(pixelDir)/p1.w;
	l /= dirLength / max(uLength, 1.0);
	
	p2 = mix(p2, p1 + dir * l, step(1.0, uLength));
	vec2 coord = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
		(vID == 0 || vID > 3) ? 1.0 : -1.0	);
	float t = coord.x;
	

	float weightX = uLineWidth / float(uVPWidth);
	float weightY = uLineWidth / float(uVPHeight);
	float w = 1.0 * (1.0-float(vID != 1 && vID != 3 && vID != 5) * 2.0);
	t = coord.x;
	vec4 p = mix(p1, p2, t);
	vec2 norm = normalize(vec2(p2.y-p1.y, p1.x-p2.x)) * p.w;
	vec2 perp = vec2(weightX*norm.x, weightY*norm.y)*w;
	fColor = uColor;

	OUT_POSITION = p;
	OUT_POSITION.xy += perp;
	OUT_POSITION.z -= 0.0005;	//enhance visibility a bit
}	
