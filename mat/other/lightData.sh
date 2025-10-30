#ifndef LIGHT_DATA_SH
#define LIGHT_DATA_SH

#define LIGHT_FLAG_CAST_SHADOWS		(1<<24)
#define LIGHT_FLAG_GEL_GRAYSCALE	(1<<25)
#define LIGHT_FLAG_POINT			(1<<26)
#define LIGHT_FLAG_SPHERE 		 	(1<<27)

struct LightData
{
	packed_vec4  positionTileRadius; // { x32, y32, z32, gelTile16, radius16 }
	packed_uvec4 sizeAxisXY;		 // { w16, h16, axisXY48, axisY48 }
	packed_uvec2 colorFlagsBright;	 // { flags8, r8, g8, b8, brightness32 }
	packed_uvec2 spotGelTexture;	 // { spotSharpness16, spotSinAngle16, gelTextureIndex32 }
};

USE_STRUCTUREDBUFFER(LightData, bLightData);

uniform int	uLightCountTotal;
uniform int	uLightCountPoint;
uniform int uSceneUnit;

#endif
