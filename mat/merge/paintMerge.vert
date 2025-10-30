#include "../state.vert"

//Copied from Layer.sh
uniform vec4 uViewportScaleBias;
uniform vec4	uQuads[16];
#if defined(EFFECT_POSITIONAL)
	void	PaintMerge( inout VertexState s )
	{
		// Positional shaders need Merge to set an explicit raster position
		s.rasterPosition.xy = 2.0 * s.texCoord.uvCoord.xy - vec2(1.0,1.0);

		vec4 scaleBias = uViewportScaleBias;
		#ifdef RENDERTARGET_Y_DOWN
			//flip raster position so that all rendered results are upside down
			s.rasterPosition.y = -s.rasterPosition.y;
			scaleBias.w = -scaleBias.w;
		#endif
		s.rasterPosition.xy = (s.rasterPosition.xy * scaleBias.xy) + scaleBias.zw;
		s.rasterPosition.z = 0.5;
		s.rasterPosition.w = 1.0;
		s.texCoord.uvCoord.zw = s.texCoord.uvCoord.xy;
	}
	#define Merge PaintMerge

#else
	#ifdef COLOR_SAMPLE
		void	PaintMerge( inout VertexState s )
		{
			switch(s.vertexID % 3)
			{
			case 0: s.rasterPosition = vec4( 1.0, -1.0, 0.0, 1.0); break;
			case 1: s.rasterPosition = vec4(-1.0,  1.0, 0.0, 1.0); break;
			case 2: s.rasterPosition = vec4(-1.0, -1.0, 0.0, 1.0); break;
			}
		}
		#define Merge PaintMerge
	#else
		#define VERT_NOATTRIBS
		//sparseness for fast paint compositing (especially fit-to-brush)
		#ifdef SPARSE_BUFFER_SIZE
			#define SPARSE_PAINT_COMPOSITE
			USE_TEXTURE2D(tSparseMap);
			uniform int uSparseRefValue;
		#endif
		void	PaintPremerge( inout VertexState s )
		{
			vec4 scaleBias = uViewportScaleBias;
		
			int vID = s.vertexID%6;
			vec2 pos = vec2(	(vID > 1 && vID != 5) ? 1.0 : 0.0,
								(vID == 0 || vID > 3) ? 0.0 : 1.0	);
			vec4 blit = uQuads[s.vertexID/6];

			#ifdef SPARSE_PAINT_COMPOSITE
				int sector = (s.vertexID/6);
				int sectorX = sector % SPARSE_BUFFER_SIZE;
				int sectorY = sector / SPARSE_BUFFER_SIZE;
				blit = vec4((float)sectorX / (float)SPARSE_BUFFER_SIZE, (float)sectorY / (float)SPARSE_BUFFER_SIZE,
					1.0/(float)SPARSE_BUFFER_SIZE, 1.0/(float)SPARSE_BUFFER_SIZE);
				vec4 sparseData = imageLoad(tSparseMap, uint2(sectorX, SPARSE_BUFFER_SIZE-1-sectorY));
			#endif
			s.texCoord.uvCoord.xy = blit.xy + pos.xy * blit.zw;;
			//flip raster position so that all rendered results are upside down
			#ifdef RENDERTARGET_Y_DOWN
					scaleBias.w = -scaleBias.w;
					s.texCoord.uvCoord.xy = blit.xy + pos.xy * (vec2(blit.z, -blit.w));
					s.texCoord.uvCoord.y = 1.0 - blit.w - s.texCoord.uvCoord.y;
					pos.y = 1.0 - pos.y;

			#else
			#endif
			pos = 2.0 * (blit.xy + blit.zw * pos) - vec2(1.0,1.0);
			pos = (pos * scaleBias.xy) + scaleBias.zw;

			s.position.xy = pos;

			s.texCoord.uvCoord.zw = s.texCoord.uvCoord.xy;
		
			s.position.z = 0.5;
			#ifdef SPARSE_PAINT_COMPOSITE
				//discard the tri if not inside the sparseness area
				s.position.z = mix(s.position.z, 9999.0, (float)((int)(sparseData.x*255.0) != uSparseRefValue));
			#endif
		}
		#define Premerge PaintPremerge
	#endif
#endif
