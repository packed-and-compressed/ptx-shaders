#include "data/shader/mat/state.frag"

#if defined(SHADER_PIXEL) || defined(SHADER_COMPUTE)

//NOOP
#define	MaterialCompositeBlendFactor(p,l,puv,suv,vc)	1.0
#define	MaterialComposite(p,s,m,lm,l)

#endif
