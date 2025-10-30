USE_TEXTURE2D(tDepth);
USE_TEXTURE2D(tSelection);
uniform vec4 uColor;
uniform int uID;
uniform int uClipSphere;		//for sphere lights
uniform int uShadowing;
USE_LOADSTORE_BUFFER(uint,bMeshID,1);
BEGIN_PARAMS
	OUTPUT_COLOR0(vec4)
	INPUT0(vec4, fVPPos)
	INPUT1(float, fZ)
	INPUT2(vec2, fTexCoord)
END_PARAMS
{
	if(uClipSphere == 1 && length(fTexCoord) > 0.5)
	{ discard; }
	//test against our depth texture, if we're in fact using occlusion
	vec3 vpCoords = fVPPos.xyz / fVPPos.w;
	vpCoords.xy = vpCoords.xy * 0.5 + 0.5;
	vec4 selection = texture2D(tSelection, vec2(vpCoords.x, 1.0-vpCoords.y)).x;
	if(selection.r == 0.0)
	{ discard; }
	float depth = texture2D(tDepth, vec2(vpCoords.x, 1.0-vpCoords.y)).x;
	float bias = -0.0048 * abs(fZ); 
	OUT_COLOR0 = uColor;
//	OUT_COLOR0.r = selection.r;
	if(fZ < depth + bias && uShadowing == 1)
	{ OUT_COLOR0.rgb = vec3(0.0, 0.0, 0.5); }
	else
	{ bMeshID[uID] = 1; }
}
