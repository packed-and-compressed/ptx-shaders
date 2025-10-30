#include "../common/util.sh"

#define	ROW_WIDTH	256

USE_TEXTURE2D(tPositions);
USE_TEXTURE2D(tOffsets);

uniform mat4	uViewProjection;
uniform float	uOffsetLength;

BEGIN_PARAMS
	INPUT_VERTEXID(vertexID)
	OUTPUT0(vec4,fColor)
END_PARAMS
{
	bool useOffset = (vertexID & 1) > 0;
	uint id = vertexID / 2;
	vec2 uv = vec2(	float(id % ROW_WIDTH)/float(ROW_WIDTH-1),
					float(id / ROW_WIDTH)/float(ROW_WIDTH-1) );

	vec4 pos = texture2DLod( tPositions, uv, 0.0 );
	vec4 offset = texture2DLod( tOffsets, uv, 0.0 );
	if( useOffset )
	{ pos.xyz += (pos.w * uOffsetLength) * offset.xyz; }

	OUT_POSITION = mulPoint( uViewProjection, pos.xyz );

	fColor.rgb = mix( vec3(1.0,0.0,0.1), vec3(0.1,0.9,0.1), offset.w );
	fColor.a = useOffset ? 0.33 : 1.0;
	fColor.rgb *= fColor.a;
}