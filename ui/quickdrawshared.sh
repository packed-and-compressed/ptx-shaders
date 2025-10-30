vec2 toPixel(vec4 projected)
{
	vec2 px = projected.xy / projected.w * 0.5;
	px.y *= -1.0;
	px.xy += 0.5;
	px.x *= float(uViewRect.z);
	px.x += float(uViewRect.x);
	px.y *= float(uViewRect.w);
	px.y += float(uBufferHeight-uViewRect.w-uViewRect.y);	//account for the area in the buffer above the viewport
	
	return px;
}

vec4 applyRasterOffset(vec4 ss)
{
	//account for differing origins in our projections
	vec4 adjust = mulPoint(uViewProjectionMatrix, mulPoint(uModelMatrix, vec3(0.0, 0.0, 0.0)).xyz);
	adjust.xy = (adjust.xy / adjust.w * 0.5 + 0.5) * vec2(uViewRect.zw);
	vec2 px = (ss.xy / ss.w * 0.5 + 0.5) * vec2(uViewRect.zw);
	px.xy -= adjust.xy;
	vec4 npx = mulPoint(uRasterTransform, vec3(px.x, px.y, 0.0));
	npx.xy += adjust.xy;
	ss.xy = (npx.xy / vec2(uViewRect.zw) - 0.5) * 2.0 * ss.w;
	return ss;
}

