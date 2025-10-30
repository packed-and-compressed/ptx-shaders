#define kLogBandTextureWidth 12

/*struct VertexStruct
{
	float4 position : SV_Position;
	float4 color : U_COLOR;
	float2 texcoord : U_TEXCOORD;
	nointerpolation float4 banding : U_BANDING;
	nointerpolation int4 glyph : U_GLYPH;
};*/

USE_TEXTURE2D(tCurveTexture);
USE_TYPEDTEXTURE2D(uint, tBandTexture);

#define slug_code uint

uint CalcRootCode(float y1, float y2, float y3)
{
	uint i1 = asuint(y1) >> 31U;
	uint i2 = asuint(y2) >> 30U;
	uint i3 = asuint(y3) >> 29U;

	uint shift = (i2 & 2U) | (i1 & ~2U);
	shift = (i3 & 4U) | (shift & ~4U);

	return ((0x2E74U >> shift) & 0x0101U);
}

bool TestCurve(uint code) {return (code != 0U);}
bool TestRoot1(uint code) {return ((code & 1U) != 0U);}
bool TestRoot2(uint code) {return (code > 1U);}

float2 SolveHorizPoly(float4 p12, float2 p3)
{
	float2 a = p12.xy - p12.zw * 2.0 + p3;
	float2 b = p12.xy - p12.zw;
	float ra = 1.0 / a.y;
	float rb = 0.5 / b.y;

	float d = sqrt(max(b.y * b.y - a.y * p12.y, 0.0));
	float t1 = (b.y - d) * ra;
	float t2 = (b.y + d) * ra;

	if (abs(a.y) < 1.0 / 65536.0) t1 = t2 = p12.y * rb;

	return (float2((a.x * t1 - b.x * 2.0) * t1 + p12.x, (a.x * t2 - b.x * 2.0) * t2 + p12.x));
}

float2 SolveVertPoly(float4 p12, float2 p3)
{
	float2 a = p12.xy - p12.zw * 2.0 + p3;
	float2 b = p12.xy - p12.zw;
	float ra = 1.0 / a.x;
	float rb = 0.5 / b.x;

	float d = sqrt(max(b.x * b.x - a.x * p12.x, 0.0));
	float t1 = (b.x - d) * ra;
	float t2 = (b.x + d) * ra;

	if (abs(a.x) < 1.0 / 65536.0) t1 = t2 = p12.x * rb;

	return (float2((a.y * t1 - b.y * 2.0) * t1 + p12.y, (a.y * t2 - b.y * 2.0) * t2 + p12.y));
}

int2 CalcBandLoc(int2 glyphLoc, uint offset)
{
	int2 bandLoc = int2(glyphLoc.x + int(offset), glyphLoc.y);
	bandLoc.y += bandLoc.x >> kLogBandTextureWidth;
	bandLoc.x &= (1 << kLogBandTextureWidth) - 1;
	return (bandLoc);
}

float CalcCoverage(float xcov, float ycov, float xwgt, float ywgt)
{
	float coverage = saturate(max(abs(xcov * xwgt + ycov * ywgt) / max(xwgt + ywgt, 1.0 / 65536.0), min(abs(xcov), abs(ycov))));

	#if defined(SLUG_WEIGHT)

		coverage = sqrt(coverage);

	#endif

	return (coverage);
}

#if defined(SLUG_MULTICOLOR)

	float4 ApplyLayerColor(uint2 layerData, float coverage, float4 finalColor)
	{
		float3 layerColor = float3(float(layerData.x & 0xFFU), float(layerData.x >> 8U), float(layerData.y & 0xFFU)) * (1.0 / 255.0);

		return (float4(lerp(finalColor.xyz, layerColor, coverage), saturate(finalColor.w + coverage)));
	}

#endif

float4 RenderGlyph(float2 pixelPosition, float4 vertexColor, float4 bandTransform, int4 glyphData)
{
	int curveIndex;

	float2 renderCoord = pixelPosition;
	float2 emsPerPixel = fwidth(renderCoord);
	float2 pixelsPerEm = 1.0 / emsPerPixel;

	int2 bandMax = glyphData.zw;
	bandMax.y &= 0x00FF;

	#if defined(SLUG_SUPER)

		int sampleIndex;
		int2 bandIndex;

		int2 sampleCount = clamp(int2(emsPerPixel * 16.0 + 1.0), int2(1, 1), int2(4, 4));

	#else

		int2 bandIndex = clamp(int2(renderCoord * bandTransform.xy + bandTransform.zw), int2(0, 0), bandMax);

	#endif

	#if defined(SLUG_STROKE)

		int curveCount = (glyphData.w >> 9) & 0x0F;
		if (curveCount == 0)
		{

	#endif

	#if defined(SLUG_LINEAR)

		if ((glyphData.w & 0x0100) == 0)
		{

	#endif

	#if defined(SLUG_MULTICOLOR)

		float4 finalColor = float4(0.0, 0.0, 0.0, 0.0);
		int2 colorLoc = glyphData.xy;

		int layerCount = int(imageLoad(tBandTexture, colorLoc).x);
		colorLoc.x += 1;

		for (int layer = 0; layer < layerCount; layer++)
		{
			int2 glyphLoc = int2(imageLoad(tBandTexture, int2(colorLoc.x, colorLoc.y)).xy);
			uint2 layerData = imageLoad(tBandTexture, int2(colorLoc.x + 1, colorLoc.y)).xy;
			colorLoc.x += 2;

	#else

		int2 glyphLoc = glyphData.xy;

	#endif

			float xcov = 0.0;
			float xwgt = 0.0;

			#if defined(SLUG_SUPER)

				renderCoord.y -= emsPerPixel.y * (float(sampleCount.y - 1) / float(sampleCount.y * 2));
				for (sampleIndex = 0; sampleIndex < sampleCount.y; sampleIndex++)
				{
					bandIndex.y = clamp(int(renderCoord.y * bandTransform.y + bandTransform.w), 0, bandMax.y);

			#endif

			uint4 hbandData = imageLoad(tBandTexture, uint2(glyphLoc.x + bandIndex.y, glyphLoc.y));
			int2 hbandLoc = CalcBandLoc(glyphLoc, hbandData.y);

			for (curveIndex = 0; curveIndex < int(hbandData.x); curveIndex++)
			{
				int2 curveLoc = int2(imageLoad(tBandTexture, int2(hbandLoc.x + curveIndex, hbandLoc.y)).xy);
				float4 p12 = imageLoad(tCurveTexture, curveLoc) - float4(renderCoord, renderCoord);
				float2 p3 = imageLoad(tCurveTexture, int2(curveLoc.x + 1, curveLoc.y)).xy - renderCoord;

				if (max(max(p12.x, p12.z), p3.x) * pixelsPerEm.x < -0.5) break;

				slug_code code = CalcRootCode(p12.y, p12.w, p3.y);
				if (TestCurve(code))
				{
					float2 r = SolveHorizPoly(p12, p3) * pixelsPerEm.x;

					if (TestRoot1(code))
					{
						xcov += saturate(r.x + 0.5);
						xwgt = max(xwgt, saturate(1.0 - abs(r.x) * 2.0));
					}

					if (TestRoot2(code))
					{
						xcov -= saturate(r.y + 0.5);
						xwgt = max(xwgt, saturate(1.0 - abs(r.y) * 2.0));
					}
				}
			}

			#if defined(SLUG_SUPER)

					renderCoord.y += emsPerPixel.y / float(sampleCount.y);
				}

			#endif

			float ycov = 0.0;
			float ywgt = 0.0;

			#if defined(SLUG_SUPER)

				renderCoord = float2(pixelPosition.x - emsPerPixel.x * (float(sampleCount.x - 1) / float(sampleCount.x * 2)), pixelPosition.y);
				for (sampleIndex = 0; sampleIndex < sampleCount.x; sampleIndex++)
				{
					bandIndex.x = clamp(int(renderCoord.x * bandTransform.x + bandTransform.z), 0, bandMax.x);

			#endif

			uint4 vbandData = imageLoad(tBandTexture, int2(glyphLoc.x + bandMax.y + 1 + bandIndex.x, glyphLoc.y));
			int2 vbandLoc = CalcBandLoc(glyphLoc, vbandData.y);

			for (curveIndex = 0; curveIndex < int(vbandData.x); curveIndex++)
			{
				int2 curveLoc = int2(imageLoad(tBandTexture, int2(vbandLoc.x + curveIndex, vbandLoc.y)).xy);
				float4 p12 = imageLoad(tCurveTexture, curveLoc) - float4(renderCoord, renderCoord);
				float2 p3 = imageLoad(tCurveTexture, int2(curveLoc.x + 1, curveLoc.y)).xy - renderCoord;

				if (max(max(p12.y, p12.w), p3.y) * pixelsPerEm.y < -0.5) break;

				slug_code code = CalcRootCode(p12.x, p12.z, p3.x);
				if (TestCurve(code))
				{
					float2 r = SolveVertPoly(p12, p3) * pixelsPerEm.y;

					if (TestRoot1(code))
					{
						ycov -= saturate(r.x + 0.5);
						ywgt = max(ywgt, saturate(1.0 - abs(r.x) * 2.0));
					}

					if (TestRoot2(code))
					{
						ycov += saturate(r.y + 0.5);
						ywgt = max(ywgt, saturate(1.0 - abs(r.y) * 2.0));
					}
				}
			}

			#if defined(SLUG_SUPER)

					renderCoord.x += emsPerPixel.x / float(sampleCount.x);
				}

				xcov *= 1.0 / float(sampleCount.y);
				ycov *= 1.0 / float(sampleCount.x);

			#endif

			float coverage = CalcCoverage(xcov, ycov, xwgt, ywgt);

	#if defined(SLUG_MULTICOLOR)

			finalColor = ApplyLayerColor(layerData, coverage, finalColor);

			#if defined(SLUG_SUPER)

				renderCoord.x = pixelPosition.x;

			#endif
		}

		return (float4(finalColor.xyz, finalColor.w));

	#else

		return (float4(vertexColor.xyz, coverage));

	#endif

	#if defined(SLUG_LINEAR)

		}
		else
		{
			#if defined(SLUG_MULTICOLOR)

				float4 finalColor = float4(0.0, 0.0, 0.0, 0.0);
				int2 colorLoc = glyphData.xy;

				int layerCount = int(imageLoad(tBandTexture, colorLoc).x);
				colorLoc.x += 1;

				for (int layer = 0; layer < layerCount; layer++)
				{
					int2 glyphLoc = int2(imageLoad(tBandTexture, int2(colorLoc.x, colorLoc.y)).xy);
					uint2 layerData = imageLoad(tBandTexture, int2(colorLoc.x + 1, colorLoc.y)).xy;
					colorLoc.x += 2;

			#else

				int2 glyphLoc = glyphData.xy;

			#endif

					float xcov = 0.0;
					float xwgt = 0.0;

					#if defined(SLUG_SUPER)

						renderCoord.y -= emsPerPixel.y * (float(sampleCount.y - 1) / float(sampleCount.y * 2));
						for (sampleIndex = 0; sampleIndex < sampleCount.y; sampleIndex++)
						{
							bandIndex.y = clamp(int(renderCoord.y * bandTransform.y + bandTransform.w), 0, bandMax.y);

					#endif

					uint4 hbandData = imageLoad(tBandTexture, uint2(glyphLoc.x + bandIndex.y, glyphLoc.y));
					int2 hbandLoc = CalcBandLoc(glyphLoc, hbandData.y);

					for (curveIndex = 0; curveIndex < int(hbandData.x); curveIndex++)
					{
						int2 curveLoc = int2(imageLoad(tBandTexture, int2(hbandLoc.x + curveIndex, hbandLoc.y)).xy);
						float4 p12 = imageLoad(tCurveTexture, curveLoc) - float4(renderCoord, renderCoord);

						if (max(p12.x, p12.z) * pixelsPerEm.x < -0.5) break;

						if ((asint(p12.y) ^ asint(p12.w)) < 0)
						{
							float r = (p12.x - p12.y * (p12.z - p12.x) / (p12.w - p12.y)) * pixelsPerEm.x;
							float s = saturate(r + 0.5);
							xcov += (p12.y < 0.0) ? -s : s;
							xwgt = max(xwgt, saturate(1.0 - abs(r) * 2.0));
						}
					}

					#if defined(SLUG_SUPER)

							renderCoord.y += emsPerPixel.y / float(sampleCount.y);
						}

					#endif

					float ycov = 0.0;
					float ywgt = 0.0;

					#if defined(SLUG_SUPER)

						renderCoord = float2(pixelPosition.x - emsPerPixel.x * (float(sampleCount.x - 1) / float(sampleCount.x * 2)), pixelPosition.y);
						for (sampleIndex = 0; sampleIndex < sampleCount.x; sampleIndex++)
						{
							bandIndex.x = clamp(int(renderCoord.x * bandTransform.x + bandTransform.z), 0, bandMax.x);

					#endif

					uint4 vbandData = imageLoad(tBandTexture, int2(glyphLoc.x + bandMax.y + 1 + bandIndex.x, glyphLoc.y));
					int2 vbandLoc = CalcBandLoc(glyphLoc, vbandData.y);

					for (curveIndex = 0; curveIndex < int(vbandData.x); curveIndex++)
					{
						int2 curveLoc = int2(imageLoad(tBandTexture, int2(vbandLoc.x + curveIndex, vbandLoc.y)).xy);
						float4 p12 = imageLoad(tCurveTexture, curveLoc) - float4(renderCoord, renderCoord);

						if (max(p12.y, p12.w) * pixelsPerEm.y < -0.5) break;

						if ((asint(p12.x) ^ asint(p12.z)) < 0)
						{
							float r = (p12.y - p12.x * (p12.w - p12.y) / (p12.z - p12.x)) * pixelsPerEm.y;
							float s = saturate(r + 0.5);
							ycov += (p12.z < 0.0) ? -s : s;
							ywgt = max(ywgt, saturate(1.0 - abs(r) * 2.0));
						}
					}

					#if defined(SLUG_SUPER)

							renderCoord.x += emsPerPixel.x / float(sampleCount.x);
						}

						xcov *= 1.0 / float(sampleCount.y);
						ycov *= 1.0 / float(sampleCount.x);

					#endif

					float coverage = CalcCoverage(xcov, ycov, xwgt, ywgt);

			#if defined(SLUG_MULTICOLOR)

					finalColor = ApplyLayerColor(layerData, coverage, finalColor);

					#if defined(SLUG_SUPER)

						renderCoord.x = pixelPosition.x;

					#endif
				}

				return (float4(finalColor.xyz, finalColor.w));

			#else

				return (float4(vertexColor.xyz, coverage));

			#endif
		}

	#endif

	#if defined(SLUG_STROKE)

		}
		else
		{
			curveCount += glyphData.x;

			float xcov = 0.0;
			float xwgt = 0.0;
			float4 p12 = imageLoad(tCurveTexture, glyphData.xy) - float4(renderCoord, renderCoord);
			
			curveIndex = glyphData.x;
			do
			{
				float4 p3 = imageLoad(tCurveTexture, int2(++curveIndex, glyphData.y)) - float4(renderCoord, renderCoord);

				slug_code code = CalcRootCode(p12.y, p12.w, p3.y);
				if (TestCurve(code))
				{
					float2 r = SolveHorizPoly(p12, p3.xy) * pixelsPerEm.x;

					if (TestRoot1(code))
					{
						xcov += saturate(r.x + 0.5);
						xwgt = max(xwgt, saturate(1.0 - abs(r.x) * 2.0));
					}

					if (TestRoot2(code))
					{
						xcov -= saturate(r.y + 0.5);
						xwgt = max(xwgt, saturate(1.0 - abs(r.y) * 2.0));
					}
				}

				p12 = p3;
			} while (curveIndex < curveCount);

			float ycov = 0.0;
			float ywgt = 0.0;
			p12 = imageLoad(tCurveTexture, glyphData.xy) - float4(renderCoord, renderCoord);

			curveIndex = glyphData.x;
			do
			{
				float4 p3 = imageLoad(tCurveTexture, int2(++curveIndex, glyphData.y)) - float4(renderCoord, renderCoord);

				slug_code code = CalcRootCode(p12.x, p12.z, p3.x);
				if (TestCurve(code))
				{
					float2 r = SolveVertPoly(p12, p3.xy) * pixelsPerEm.y;

					if (TestRoot1(code))
					{
						ycov -= saturate(r.x + 0.5);
						ywgt = max(ywgt, saturate(1.0 - abs(r.x) * 2.0));
					}

					if (TestRoot2(code))
					{
						ycov += saturate(r.y + 0.5);
						ywgt = max(ywgt, saturate(1.0 - abs(r.y) * 2.0));
					}
				}

				p12 = p3;
			} while (curveIndex < curveCount);

			float coverage = CalcCoverage(xcov, ycov, xwgt, ywgt);
			return (float4(vertexColor.xyz, coverage));
		}

	#endif
}

float4 SlugRender(float2 pixelPosition, float4 vertexColor, float4 bandTransform, int4 glyphData)
{
	float4 color = RenderGlyph(pixelPosition, vertexColor, bandTransform, glyphData);

	#if defined(SLUG_GRADIENT)

		int gradType = glyphData.w >> 13;
		if (gradType != 0)
		{
			int2 gradLoc = int2(imageLoad(tBandTexture, int2(glyphData.x - 1, glyphData.y)).xy);
			float3 gradGeom = imageLoad(tCurveTexture, gradLoc).xyz;
			float4 gradColor1 = imageLoad(tCurveTexture, int2(gradLoc.x + 1, gradLoc.y));
			float4 gradColor2 = imageLoad(tCurveTexture, int2(gradLoc.x + 2, gradLoc.y));

			float t = (gradType == 1) ? saturate(gradGeom.x * pixelPosition.x + gradGeom.y * pixelPosition.y + gradGeom.z) : min(length(float2(pixelPosition.x * gradGeom.z - gradGeom.x, pixelPosition.y * gradGeom.z - gradGeom.y)), 1.0);
			color *= lerp(gradColor1, gradColor2, t);
		}

	#endif

	#if defined(SLUG_COVERAGE)
		return (float4(color.xyz * color.w, color.w * vertexColor.w));
	#elif defined(SLUG_INVERSE_COVERAGE)
		return (float4(color.xyz * (1.0 - color.w), color.w * vertexColor.w));
	#else
		return (float4(color.xyz, color.w * vertexColor.w));
	#endif
}

BEGIN_PARAMS
	INPUT0(float4, fPosition)
	INPUT1(float4, fColor)
	INPUT2(float2, fTexCoord)
	INPUT3(float4, fBanding)
	INPUT4(int4, fGlyph)

	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	OUT_COLOR0 = SlugRender(fTexCoord, fColor, fBanding, fGlyph);
}
