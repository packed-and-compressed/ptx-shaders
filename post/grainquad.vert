#include "../common/util.sh"

#define QUAD_TEXTURE_ROW (8)
#define QUAD_TEXTURE_COLUMN (16)
#define QUAD_TEXTURE_WIDTH (4096)
#define QUAD_TEXTURE_HEIGHT (2048)
#define QUAD_WIDTH (float( QUAD_TEXTURE_WIDTH ) / float( QUAD_TEXTURE_COLUMN ))
#define QUAD_HEIGHT (float( QUAD_TEXTURE_HEIGHT ) / float( QUAD_TEXTURE_ROW ))

USE_BUFFER(int, bSpriteIndices);
USE_BUFFER(mat4x4, bQuadTransforms);
uniform float uScale;

BEGIN_PARAMS
INPUT_VERTEXID(VertexID)
INPUT_INSTANCEID(InstanceID)

OUTPUT0( vec2, fSpriteCoord )
OUTPUT1( float, Opacity )
END_PARAMS
{
	int uSprite = bSpriteIndices[InstanceID];
	mat4x4 uTransform = bQuadTransforms[InstanceID];
	Opacity = col3(uTransform).w;
	col3(uTransform).w = 1.0f;

	float2 texcoord = float2( VertexID & 1,VertexID >> 1 );

	int2   tile = int2( uSprite / QUAD_TEXTURE_ROW, uSprite % QUAD_TEXTURE_COLUMN );
	float  xmin = tile.x * QUAD_WIDTH / float( QUAD_TEXTURE_WIDTH );
	float  xmax = ( tile.x + 1 ) * QUAD_WIDTH / float( QUAD_TEXTURE_WIDTH );
	float  ymin = tile.y * QUAD_HEIGHT / float( QUAD_TEXTURE_HEIGHT );
	float  ymax = ( tile.y + 1 ) * QUAD_HEIGHT / float( QUAD_TEXTURE_HEIGHT );
	fSpriteCoord.x = ( int2(texcoord).x == 0 ) ? xmin : xmax;
	fSpriteCoord.y = ( int2(texcoord).y == 0 ) ? ymin : ymax;
	#ifdef RENDERTARGET_Y_DOWN
		fSpriteCoord.y = 1.0 - fSpriteCoord.y;
	#endif

	float3 position = float3(( texcoord.x - 0.5f ) * 2.0f,-( texcoord.y - 0.5f ) * 2.0f, 0.f);
	position = mulVec( uTransform, position ).xyz;
	position.x *= uScale;
	position.xy += col3(uTransform).xy;

	OUT_POSITION = float4(position.xy, 0.0f, 1.0f);
}
