#ifndef LAYER_BUFFER_SH
#define LAYER_BUFFER_SH

#if	defined(CPR_D3D)
	#define LayerBuffer2D Texture2D
#elif defined(CPR_METAL)
	#define LayerBuffer2D texture2d<float>
#endif

USE_SAMPLER(uBufferSampler);

#define USE_LAYER_BUFFER2D(buffer)	USE_TEXTURE2D_NOSAMPLER(buffer)

#endif
