#include "../commonPaint.sh"
#include "../../common/util.sh"

uniform float	uFlip;
uniform vec2	uUVShift;		//for drawing UVs that reside outside of the 0-1 range
uniform mat4 	uTransform;
uniform vec4	uScaleBias;	//UV scale/bias
BEGIN_PARAMS
	INPUT_VERTEXID(vID)
	OUTPUT0(vec2, fTexCoord)

END_PARAMS
{
	int vertexID = vID;
	vec2 tex = vec2(	(vertexID > 1 && vertexID != 5) ? 1.0 : 0.0,
					(vertexID == 0 || vertexID > 3) ? 1.0 : 0.0	);
	fTexCoord = tex * uScaleBias.xy + uScaleBias.zw;
	//output can be in 3D space for viewport preview, or 2D texturespace space for UV preview or actual painting
	vec4 texSpace = vec4(2.0*(tex.xy - uUVShift) - vec2(1.0,1.0), 0.0, 1.0);
	texSpace.y *= uFlip;
	texSpace.y *= -1.0;	//opposite flipness for overlay
	texSpace = mulPoint(uTransform, texSpace.xyz);
	
	OUT_POSITION = vec4(texSpace.xy, 0.0, 1.0);

}
