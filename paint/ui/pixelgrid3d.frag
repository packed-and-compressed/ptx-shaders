#include "../commonPaint.sh"
#include "../../common/util.sh"

USE_TEXTURE2D(tTex);

BEGIN_PARAMS
	INPUT0(vec2, fTexCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS

{
	uint2 size; uint mipCount;
	imageSize2D( tTex, size.x, size.y, mipCount );
	vec2 pixel = vec2(size) * fTexCoord;
	vec2 griddinessV = abs(mod(abs(pixel), vec2(1.0, 1.0)) - 0.5);
	vec2 dtx = dFdx(griddinessV);
	vec2 dty = dFdx(griddinessV);
	float dt = length(dtx+dty);
	
	float grid = pow(max(griddinessV.x, griddinessV.y), 1.0);
	grid = step(0.6, grid * 1.1 + dt * 2.0);  
	grid /= max(1.0, dt*dt * 500.0);
	vec4 tex = texture2D(tTex, fTexCoord);
	tex.a = tex.r;
	vec4 overlayColor = vec4(1.0, 1.0, 0.0, 0.0);
	
	OUT_COLOR0 = mix(tex, overlayColor, grid);
	

}
