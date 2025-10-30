#include "../common/const.sh"
#include "lenssystem.comp"

uniform int uInstanceID;
uniform vec3 uParams; // x: aspect ratio, y: aperture height, z: rotation

USE_STRUCTUREDBUFFER(Vertex,bVertexBuffer);

BEGIN_PARAMS
	INPUT_VERTEXID(VertexID)
    INPUT_INSTANCEID(InstanceID)

	OUTPUT0(vec3,Payload)
    OUTPUT1(vec2,Ndc)
    OUTPUT2(vec4,Reflectance)
END_PARAMS
{
    Vertex v = bVertexBuffer[VertexID + uInstanceID * PATCH_TESSELATION * PATCH_TESSELATION];
    float4 pos = float4(getVertexPosition(v), 1.0f);
    float2 uv = v.uv;;
    float radius = v.position.w;

    float theta = -radians( uParams.z );
	float cosTheta = cos(theta), sinTheta = sin(theta);

    float scale = 1.0f / 5.0f;
	pos.xy *= scale * vec2(1.0f, uParams.x);
    pos = pos.xyww;

    float x = uv.x;
    float y = uv.y;
    uv.x = x * cosTheta - y * sinTheta;
    uv.y = x * sinTheta + y * cosTheta;
    uv.xy = (uv.xy + 1.0f) / 2.0f;

	OUT_POSITION = pos;
    Payload = float3(uv, radius);
    Ndc = v.ndc;
    Reflectance = v.reflectance;
}
