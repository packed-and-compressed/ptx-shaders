#include "../common/util.sh"
#include "../common/projector.sh"

USE_TEXTURE2D(tMap);
USE_TEXTURE2D(tBackground);

uniform int		uChannelCount;
uniform vec4	uChannelMask;
uniform vec2	uMapSize;
uniform float	uLinearPreviewGamma;
uniform vec4	uMaterialUvScaleBias;
uniform vec2	uMaterialUvRotation;
uniform float	uMaterialTriplanarFade;
uniform float	uUseAlphaTesting;

uniform mat4	uObjectToProjectorTransform;
uniform mat4	uObjectToProjectorRotation;

vec3 sRGBToLinear( vec3 srgb )
{
	vec3 black = srgb * 0.0773993808;	
	vec3 lin = (srgb + vec3(0.055,0.055,0.055)) * 0.947867299;
	lin = pow( lin, 2.4 );

	lin.r = srgb.r <= 0.04045 ? black.r : lin.r;
	lin.g = srgb.g <= 0.04045 ? black.g : lin.g;
	lin.b = srgb.b <= 0.04045 ? black.b : lin.b;
	
	return lin;
}

BEGIN_PARAMS
	INPUT0(vec2,fTexCoord)
	INPUT1(vec3,fPosition)
	INPUT2(vec3,fNormal)
	INPUT3(vec3,fTangentBasisNormal)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	const vec3 DUMMY_TANGENT = vec3(0.0, 0.0, 0.0);
	const vec3 DUMMY_BITANGENT = vec3(0.0, 0.0, 0.0);

	vec3 triplanarVertexPosition = mulPoint( uObjectToProjectorTransform, fPosition ).xyz;
    vec3 triplanarVertexNormal = normalize( mulVec( uObjectToProjectorRotation, fNormal ) );
	vec3 triplanarTangentBasisNormal = normalize( mulVec( uObjectToProjectorRotation, fTangentBasisNormal ) );

	TriplanarProjector projector = getTriplanarProjector( triplanarVertexPosition,
														  triplanarVertexNormal,
														  createTangentBasis( DUMMY_TANGENT, DUMMY_BITANGENT, triplanarTangentBasisNormal ),
														  uMaterialUvScaleBias,
														  uMaterialUvRotation,
														  uMaterialTriplanarFade );

	vec4 backX = texture2D( tBackground, projector.uvX.xy * ( ( 1.0 / 16.0 ) * uMapSize ) );
	vec4 backY = texture2D( tBackground, projector.uvY.xy * ( ( 1.0 / 16.0 ) * uMapSize ) );
	vec4 backZ = texture2D( tBackground, projector.uvZ.xy * ( ( 1.0 / 16.0 ) * uMapSize ) );
	vec4 back = triplanarMix( projector, backX, backY, backZ );

	vec4 topX = texture2D( tMap, projector.uvX.xy );
	vec4 topY = texture2D( tMap, projector.uvY.xy );
	vec4 topZ = texture2D( tMap, projector.uvZ.xy );
	vec4 top = triplanarMix( projector, topX, topY, topZ );

	vec4 outColor = vec4( 0.0, 0.0, 0.0, 1.0 );

	if( uChannelCount == 1 )
	{
		float col = dot( top, uChannelMask );
		top = vec4( col, col, col, 1.0f );
	}
	if( uChannelCount == 2 )
	{
		top = vec4( top.r, top.r, top.r, top.g );
	}

	if(uUseAlphaTesting == 1.0 && top.a < 1.0/255.0)
	{ discard; }
	//alpha blend
	outColor.rgb = mix( back.rgb, top.rgb, top.a );
	outColor.rgb = mix( outColor.rgb, sRGBToLinear(outColor.rgb), uLinearPreviewGamma );
	OUT_COLOR0 = outColor;
}
	
