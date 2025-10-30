
#ifdef CLONE_STAMP_DEST
#include "clonestamputils.sh"
#endif

uniform vec2 uBufferSizeInv;
USE_TEXTURE2D(tFlow);
USE_TEXTURE2D(tOpacity);
USE_TEXTURE2D(tSelection);

void padFrom(inout vec4 inStroke, vec2 coord)
{
	vec4 sampy = texture2D(tFlow, coord);
	sampy.g = texture2D(tOpacity, coord).a;
	
	//only expand the stroke if there's nonzero flow nearby, otherwise our
	//sparse mask for the stroke gets populated by a lot of non-stroked areas
	inStroke = mix(inStroke, sampy, float(sampy.g > inStroke.g && max(sampy.r, inStroke.r) > 0.0) );
}

BEGIN_PARAMS
	INPUT0(vec2, fCoord)
	OUTPUT_COLOR0(vec4)
END_PARAMS
{
	vec2 strokeCoords = fCoord.xy;
	
#ifdef CLONE_PRECOMPOSITE
	strokeCoords = computeUnitModelUVs( strokeCoords, uModelUVRange ).xy;
#endif

	vec4 inStroke = texture2D( tFlow, strokeCoords );
	vec4 opbuffer = texture2D( tOpacity, strokeCoords );

#ifdef CLONE_PRECOMPOSITE
	inStroke.r = inStroke.z;
	inStroke.gba = vec3(0,0,0);
#endif

	vec4 selection = texture2D(tSelection, strokeCoords);
	float mask = opbuffer.r;		//coverage mask of our stroke, including all previous regenerations
	inStroke.g = opbuffer.a;
	float UVMask = inStroke.g;	//full UV area of the everything
	
#ifndef CLONE_PRECOMPOSITE
	//bleed!
	if(UVMask == 0.0 && selection.r != 0.0)
	{
		vec2 dUV = uBufferSizeInv;
		padFrom(inStroke, strokeCoords + vec2(dUV.x, 0.0));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x, 0.0));
		padFrom(inStroke, strokeCoords + vec2(0.0, dUV.y));
		padFrom(inStroke, strokeCoords + vec2(0.0, -dUV.y));
	
	#define DO_EXTRA_PADDING
	#ifdef DO_EXTRA_PADDING	
		//extra pads are roughly ordered from -x to +x, no idea if it makes a difference
		padFrom(inStroke, strokeCoords + vec2(-dUV.x * 2.0, dUV.y));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x * 2.0, -dUV.y));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x*2.0, 0.0));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x, dUV.y * 2.0));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x, -dUV.y * 2.0));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x, -dUV.y));
		padFrom(inStroke, strokeCoords + vec2(-dUV.x, dUV.y));

		padFrom(inStroke, strokeCoords + vec2(0.0, dUV.y*2.0));
		padFrom(inStroke, strokeCoords + vec2(0.0, -dUV.y*2.0));
		
		padFrom(inStroke, strokeCoords + vec2(dUV.x, dUV.y));
		padFrom(inStroke, strokeCoords + vec2(dUV.x, -dUV.y));
		padFrom(inStroke, strokeCoords + vec2(dUV.x, dUV.y * 2.0));
		padFrom(inStroke, strokeCoords + vec2(dUV.x, -dUV.y * 2.0));
		padFrom(inStroke, strokeCoords + vec2(dUV.x * 2.0, dUV.y));
		padFrom(inStroke, strokeCoords + vec2(dUV.x*2.0, 0.0));
		padFrom(inStroke, strokeCoords + vec2(dUV.x * 2.0, -dUV.y));
	#endif
		
		mask = max(inStroke.g, mask);	//the cumulative mask also must bleeed
	}
#endif

	float flow = inStroke.r;
	float opacity = inStroke.g;
	float alpha = opacity;
	alpha *= saturate(flow);
	#ifndef CLONE_PRECOMPOSITE
		alpha *= selection.r;
	#endif
	OUT_COLOR0 = vec4(alpha, mask, alpha, alpha);
}
