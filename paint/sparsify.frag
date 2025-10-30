uniform ivec2 uTexSize;
uniform int uChunkSizeX;
uniform int uChunkSizeY;
uniform int uComponents;

USE_TEXTURE2D(tTex);



BEGIN_PARAMS
	INPUT0(vec2,fCoord)

	OUTPUT_COLOR0(float)
END_PARAMS
{
	//establish bounds
	int xStart = uChunkSizeX * int(floor(IN_POSITION.x));
	int yStart = uChunkSizeY * int(floor(IN_POSITION.y));
	int xEnd = min(xStart + uChunkSizeX, uTexSize.x);
	int yEnd = min(yStart + uChunkSizeY, uTexSize.y);
	float val = 0.0;
	for(int y = yStart; y < yEnd && val == 0.0; y++)
	{
		float v = float(y)/float(uTexSize.y);
		for(int x = xStart; x < xEnd && val == 0.0; x++)
		{
			float u = float(x)/float(uTexSize.x);
			vec4 t = texture2DLod(tTex, vec2(u, v), 0.0);
			val = max(val, t.r);
			val = max(val, t.g * float(uComponents>1));
			val = max(val, t.b * float(uComponents>2));
			val = max(val, t.a * float(uComponents>3));
		}
	}
//	vec4 t = texture2D(tTex, vec2(float(xStart)/float(uTexSize.x), float(yStart)/float(uTexSize.y)));
	OUT_COLOR0 = ceil(val);
//	OUT_COLOR0 = t.r;

}
