
USE_TEXTURE2D(tTex1);
USE_TEXTURE2D(tTex2);
USE_TEXTURE2D(tTex3);
USE_TEXTURE2D(tTex4);

//the component index of each texture (0-11)
uniform ivec4 uSwizzle;


BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS


{
	vec4 t1 = texture2D(tTex1, fCoord);
	vec4 t2 = texture2D(tTex2, fCoord);
	vec4 t3 = texture2D(tTex3, fCoord);
	vec4 t4 = texture2D(tTex4, fCoord);
	float vals[] = {t1.x, t1.y, t1.z, t1.w, t2.x, t2.y, t2.z, t2.w, t3.x, t3.y, t3.z, t3.w, t4.x, t4.y, t4.z, t4.w};
	OUT_COLOR0 = vec4(vals[uSwizzle.x], vals[uSwizzle.y], vals[uSwizzle.z], vals[uSwizzle.w]);
}

