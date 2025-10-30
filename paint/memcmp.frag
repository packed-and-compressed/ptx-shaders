uniform ivec2 uTexSize;
uniform int uChunkSizeX;
uniform int uChunkSizeY;
uniform int uComponents;

USE_TEXTURE2D(tTex);
USE_TEXTURE2D(tTex2);


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
	for(int y = yStart; y < yEnd; y++)
	{
		float v = float(y)/float(uTexSize.y);
		for(int x = xStart; x < xEnd; x++)
		{
			float u = float(x)/float(uTexSize.x);
			vec4 t1 = texture2DLod(tTex, vec2(u, v), 0.0);
			vec4 t2 = texture2DLod(tTex2, vec2(u, v), 0.0);
			val = max(val, length(t1-t2));
		}
	}
//	vec4 t = texture2D(tTex, vec2(float(xStart)/float(uTexSize.x), float(yStart)/float(uTexSize.y)));
	OUT_COLOR0 = ceil(val);
//	OUT_COLOR0 = t.r;

}
