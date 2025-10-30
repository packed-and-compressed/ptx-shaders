#include "../common/util.sh"

void SlugUnpack(float4 tex, float4 bnd, out float4 vbnd, out int4 vgly)
{
	uint2 g = asuint(tex.zw);

	vgly = int4(g.x & 0xFFFFU, g.x >> 16U, g.y & 0xFFFFU, g.y >> 16U);
	vbnd = bnd;
}

float2 SlugDilate(float4 pos, float4 tex, float4 jac, float4 m0, float4 m1, float4 m3, float2 dim, out float2 vpos)
{
	float2 n = normalize(pos.zw);
	float s = dot(m3.xy, pos.xy) + m3.w;
	float t = dot(m3.xy, n);

	float u = (s * dot(m0.xy, n) - t * (dot(m0.xy, pos.xy) + m0.w)) * dim.x;
	float v = (s * dot(m1.xy, n) - t * (dot(m1.xy, pos.xy) + m1.w)) * dim.y;

	float s2 = s * s;
	float st = s * t;
	float uv = u * u + v * v;
	float2 d = pos.zw * (s2 * (st + sqrt(uv)) / (uv - st * st));

	vpos = pos.xy + d;
	return (float2(tex.x + dot(d, jac.xy), tex.y + dot(d, jac.zw)));
}

uniform vec4 slug_matrix[4]; // row major
uniform float2 slug_viewport;
uniform float4 slug_color;

struct VertexStruct
{
	float4 position;
	float4 color;
	float2 texcoord;
	float4 banding;
	int4 glyph;
};

BEGIN_PARAMS
	INPUT0(float4,attrib0)
	INPUT1(float4,attrib1)
	INPUT2(float4,attrib2)
	INPUT3(float4,attrib3)
	INPUT4(float4,attrib4)

	OUTPUT0(float4, fPosition)
	OUTPUT1(float4, fColor)
	OUTPUT2(float2, fTexCoord)
	OUTPUT3(float4, fBanding)
	OUTPUT4(int4, fGlyph)
END_PARAMS
{
	float2 p;
	VertexStruct vresult;

	vresult.texcoord = SlugDilate(attrib0, attrib1, attrib2, slug_matrix[0], slug_matrix[1], slug_matrix[3], slug_viewport, p);
	
	// Slug library assumes the origin (0, 0) to be the top left of the screen, 
	// but in toolbag UI system, we assume the origin to be the bottom left of the screen.
	#ifdef RENDERTARGET_Y_DOWN
		p.y = 1.0 - p.y;
	#endif
	
	vresult.position.x = p.x * slug_matrix[0].x + p.y * slug_matrix[0].y + slug_matrix[0].w;
	vresult.position.y = p.x * slug_matrix[1].x + p.y * slug_matrix[1].y + slug_matrix[1].w;
	vresult.position.z = p.x * slug_matrix[2].x + p.y * slug_matrix[2].y + slug_matrix[2].w;
	vresult.position.w = p.x * slug_matrix[3].x + p.y * slug_matrix[3].y + slug_matrix[3].w;
	
	SlugUnpack(attrib1, attrib3, vresult.banding, vresult.glyph);
	vresult.color = slug_color;

	fPosition = vresult.position;
	fColor = vresult.color;
	fTexCoord = vresult.texcoord;
	fBanding = vresult.banding;
	fGlyph = vresult.glyph;

	OUT_POSITION = vresult.position;
}