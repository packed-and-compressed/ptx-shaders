
#include "../paintcompositeutil.sh"


uniform int uErasing;
uniform int uSingleChannel;
uniform vec4 uColor;

//use our compositor texture copy as a RIP buffer and update it as we update the layer's texture
//this will let us avoid updating the copy afterward.
//TODO:  use the texture target as RIP  
//this is currently disabled while I figure out what to do with srgb textures
#if defined(PAINT_FIT_TO_BRUSH) && defined(SPARSE_BUFFER_SIZE) && 0
	#define TEXTURE_COPY_RIP
	USE_LOADSTORE_TEXTURE2D(float, tExisting, 1);
#else
	USE_TEXTURE2D(tExisting);
#endif 
USE_TEXTURE2D(tStroke); 
USE_TEXTURE2D(tUV); 

//convert between RGBA and RG-as-RA textures
void toRGBA(inout vec4 c)
{	c = mix(c, c.rrrg, float(uSingleChannel)); }

void toNativeChannels(inout vec4 c)
{	c = mix(c, c.ragg, float(uSingleChannel)); }

void extrapInDirection(inout vec3 uvr,  vec2 coord, vec2 dU)
{
	vec2 t1 = texture2D(tUV, coord+dU).yz;
	vec2 t2 = texture2D(tUV, coord+dU*2.0).yz;
	if(dot(t1, t1) * dot(t2, t2) > 0.0)
	{
		vec2 nuv = t1 + (t1-t2); 
		float rate = length(dU);
		
		if(dot(nuv, nuv) > 0.0000001)
		{ uvr += vec3(nuv, 1.0) / max(rate, 0.00001); }
	}
}

void updateUVAtUVISlandBorder(inout vec2 uv, vec2 bufferUV, vec2 dUVx, vec2 dUVy)
{
	if( dot(uv, uv) != 0.0 )
	{ return; }

	//we may need to do some last-moment texture padding across UV seams
	vec3 uvr = vec3(0.0, 0.0, 0.0);
		
	extrapInDirection(uvr, bufferUV, dUVx);
	extrapInDirection(uvr, bufferUV, -dUVx);
	extrapInDirection(uvr, bufferUV, dUVy);
	extrapInDirection(uvr, bufferUV, -dUVy);
		
 	extrapInDirection(uvr, bufferUV, dUVx + dUVy);
	extrapInDirection(uvr, bufferUV, -dUVx - dUVy);
	extrapInDirection(uvr, bufferUV, dUVy - dUVx);
	extrapInDirection(uvr, bufferUV, -dUVy + dUVx);		

	if( uvr.z > 0.0 )
	{ uv = uvr.xy / uvr.z; }
}

bool mapCompositeArea(inout LayerState state)
{
	int w;
	int h;
	int mips;
	imageSize2D(tUV, w, h, mips);
	vec2 bufferUV = state.bufferCoord;
	vec2 dUVx = vec2(1.0 / float(w), 0.0);
	vec2 dUVy = vec2(0.0, 1.0 / float(w));
	state.dUVdx = dUVx;
	state.dUVdy = dUVy;
	vec4 stroke = texture2D(tStroke, bufferUV);
    if (uSingleChannel == 1)
    { stroke.g = stroke.r; }
	if(stroke.g < 0.0001)	//here, stroke.g is the cumulative mask
	{ discard; return false; }

#ifdef PAINT_FIT_TO_BRUSH
	vec2 uv = texture2D(tUV, bufferUV).yz;
	vec2 uvIn = uv;
	updateUVAtUVISlandBorder(uv, bufferUV, dUVx, dUVy);

	#ifdef MATERIAL_PASS_PAINT
		uv = transformUV( uv, uMaterialUvScaleBias, uMaterialUvRotation );
	#endif
	state.dUVdx = dFdx(uv);
	state.dUVdy = dFdy(uv);

	//stay away from the very edges of a fit-to-brush stroke to avoid mipmap issues on the border pixels (but we still need the derivative!)
	float eps = 0.0001;
	if(uvIn.x < eps || uvIn.y < eps || uvIn.y > 1.0-eps || uvIn.x > 1.0-eps)
	{ discard; return false; }
	
	state.texCoord = uv.xy;
#endif
	return true;
}

void paintStrokeComposite(vec2 surfaceCoord, ushort2 pixelCoord, inout vec4 result, vec4 stroke, vec4 existing)
{
	toRGBA(existing);
	
	float alpha = stroke.r;
	result.a *= alpha;
	result *= uColor;
		
	result = blendRGBA(existing, result);
	vec4 eraseColor = vec4(existing.rgb, existing.a * (1.0-alpha));

	//full opacity erase goes to 0, 0, 0, 0
	eraseColor = mix(eraseColor, vec4(0, 0, 0, 0), step(0.995, alpha));
	result = mix(result, eraseColor, float(uErasing));
		
	//convert to linear colorspace before dithering
	#ifndef LAYER_OUTPUT_16BIT		
		#ifdef LAYER_OUTPUT_SRGB		
		result.rgb = linearTosRGB(result.rgb);
		#endif
		result = layerDither8bitRGBA( result, pixelCoord, 89015921 ); // random prime number used as seed offset
		#ifdef LAYER_OUTPUT_SRGB
		result.rgb = sRGBToLinear(result.rgb);
		#endif
	#endif
		
	//revert to previous color if we actually had zero alpha to avoid data degradation from the srgb-linear-srgb conversion
	if(alpha == 0.0)
	{ result = existing; }
#ifdef TEXTURE_COPY_RIP
	else
	{ imageStore(tExisting, ushort2(IN_POSITION.xy), result); }
#endif
}

void paintStrokeComposite(vec2 surfaceCoord, vec2 pixelCoord, inout vec4 result)
{
	vec4 stroke = texture2D(tStroke, surfaceCoord);

	#ifdef TEXTURE_COPY_RIP
		vec4 existing = imageLoad(tExisting, uint2(IN_POSITION.xy));
	#else
		vec4 existing = texture2D(tExisting, surfaceCoord);
	#endif

    paintStrokeComposite(surfaceCoord, ushort2(pixelCoord), result, stroke, existing);
}
