#ifdef PAINT_COMPOSITE				//paint composite shaders
	#if defined(PAINT_FIT_TO_BRUSH)
		#define REMAP_COMPOSITE		//UV texture will provide material UVs
	#endif
	#include "materialcomposite.frag"
#elif defined(SPLINE_COMPOSITE)		//spline render shaders
	#ifndef SPLINE_MATERIAL_UV_PROJECTION
		#ifdef EFFECT_SPLINE_PROJECTION
			#define REMAP_COMPOSITE		//spline will supply material UVs
		#endif
	#endif
	#include "splines/splinecomposite.frag"
#else
	//if no mapping function is provided, #define it to true.  The branch in effect.frag will
	//be optimized away by the compiler.
	#define mapCompositeArea(state) true
#endif

