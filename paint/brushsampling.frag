#ifdef USE_COMPENSATION_MAP
uniform float	uUseLookup;
USE_TEXTURE2D(tUVLookup);		//for un-distorting the texture with indirection
#endif

#ifdef USE_TEXTURE
USE_TEXTURE2D(tBrushTex);
uniform float uTipContrast;
#endif

uniform float	uBrushRadius;	//UI overlay only;  helps us get a decent grid around the brush

#ifdef CLONE_STAMP_DEST
uniform float	uRadiusFactor; 
uniform float	uAlphaDistFactor;
uniform float	uCloneUVScale;
uniform mat4	uModelBrush; 
#endif

struct SplotData
{
	vec2 targetUV;
	vec4 brushCoord;
	float hardness;
	float flow;
	float opacity;
	float warp;
	int texFrame;
	int seed;
	
	//derivatives of the brush coord WITH RESPECT TO targetUV (not necessarily IN_POSITION)
	vec2 dCoordDx;
	vec2 dCoordDy;
};

//ddr is the rate of change of radial distance,  in brush coords/pixel
float sampleBrush( SplotData splot, float ddr )
{
	vec2 texCoord = splot.brushCoord.xy;

#ifdef CLONE_STAMP_DEST
	texCoord = ((texCoord - uCloneUVOffsetSampleBrush.xy) / uCloneUVScale) * 2.f;// must be in range [-1, 1]
	texCoord = distortUV( texCoord, splot.warp, splot.seed );
	texCoord = mulPoint( uModelBrush, vec3(texCoord.xy, 0.0) ).xy;
	texCoord /= uRadiusFactor;

	vec2 dP = dFdx(texCoord.xy) + dFdy(texCoord.xy);
	ddr = length(dP) * 0.707;
#endif

	float alphaDistFactor = 1.f;
	#ifdef CLONE_STAMP_DEST
		alphaDistFactor *= uAlphaDistFactor;
	#endif

	//feather the brush stroke
#ifndef USE_TEXTURE
	return distanceToValue(length(texCoord) * alphaDistFactor, ddr, splot.hardness);
#endif

	float feather = distanceToValue(getVignette(texCoord, splot.hardness) * alphaDistFactor, ddr, splot.hardness); 

#ifdef USE_TEXTURE
	
	//this line commented out because with mipmaps enabled for brushes, we get some speckling on Mac at small sizes
	//(also it looks nicer without it)
//	feather = mix(feather, 1.0, float(splot.hardness == 1.0));  //texture with splot.hardness 1.0 ignores all anti-aliasing
	unsigned int frameCount = max(uBrushFrameCount, 1);

	float sampleWidth = 1.0 / float(frameCount);
	float sampleStart = sampleWidth * float(splot.texFrame%frameCount);

	vec4 allMyExes = texture2D(tBrushTex, vec2((texCoord.x * 0.5 + 0.5) * sampleWidth + sampleStart, texCoord.y * 0.5 + 0.5));
	float texValue = allMyExes.r * allMyExes.a;
	float contrastStart = 0.1;
	float contrastAmount = smoothstep(0.0, contrastStart, texValue);
	float contrastRange = 1.0 - contrastStart;
	texValue = mix(texValue, (texValue-0.5) * uTipContrast + 0.5, contrastAmount); //apply contrast
	feather *= saturate(texValue);
#endif	
	return feather;
}
//padding around the stroke for the early out.  We need a bit more for true screenspace (not 100% sure why)
#ifdef USE_W
#define strokePadding 1.25
#elif defined(THIN_STROKE)
	#define strokePadding 3.0
#else
	#ifdef USE_OVERLAY
		#define strokePadding 2.0
	#else
		#define strokePadding 1.2
	#endif //USE_OVERLAY
#endif

#define warpPadding 1.0

SplotData makeSplotData(vec2 position, vec4 brushCoord, float hardness, int frame, int seed, float flow, float opacity, float warp)
{ 
	SplotData b; b.targetUV = position; b.brushCoord = brushCoord; b.hardness = hardness;
	b.flow = flow; b.opacity = opacity; b.warp = warp; b.texFrame = frame; b.seed = seed;
	return b;
}

//estimate the center of a brush splot based on our coordinate and its derivatives
vec2 findCenter(vec2 position, vec4 brushCoord, vec2 dbx, vec2 dby)
{
	//u- and v-axes of the quad
	vec2 u = vec2(dbx.x,  dby.x);
	vec2 v = vec2(-dbx.y, -dby.y);
	
	//right??  length was inverted with the derivatives
	u /= max(dot(u, u), 0.001);
	v /= max(dot(v, v), 0.001);
	
	vec2 center = position + brushCoord.x * -u + brushCoord.y * -v;
	return center; 
}

vec2 samplePixelBrush(SplotData splot, inout vec2 total)
{
	vec2 dP = splot.dCoordDx + splot.dCoordDy;
	float ddr = length(dP) * 0.707;
	float feather = 1.0;
	vec2 splotCenter = findCenter(splot.targetUV, splot.brushCoord, splot.dCoordDx, splot.dCoordDy);
	
	float minZ = 0.35;
	float maxZ = 0.75;
	float inZee = step(minZ, (splot.brushCoord.z)) * (1.0-step(maxZ, splot.brushCoord.z)); 

	//we can estimate the pixel radius of the projected brush.  It'll generally be
	//close enough to the actual pixel radius (may need the help of a little epsilon)
	float pixelRadius = floor(2.0/ddr + 0.5) * 0.5;
	float even = abs(fract(pixelRadius)) < 0.01; 
	vec2 toCenter = floor(splot.targetUV) - (floor(splotCenter - 0.5 * even) + 0.5 * even);
	if(abs(toCenter.x) <= pixelRadius && abs(toCenter.y) <= pixelRadius)
	{
		feather = inZee;
	}
	else feather = 0.0;

	total.y = max(total.y, splot.opacity);

	total.x = mix(total.x, 1.0, splot.flow*feather * step(0.0, feather));
	return splot.brushCoord.xy;

}

vec2 samplePaintBrush(SplotData splot, inout vec2 total)
{
	vec2 dP = splot.dCoordDx + splot.dCoordDy;
	float ddr = length(dP) * 0.707;
	//bleed (extra samples to catch subtle AA) falls off rapidly based on brush pixel size
#ifndef USE_TEXTURE
	float bleed = clamp(4.0 * ddr, 0.4, 2.0) + 1.0;    
	
#else
	float bleed = 1.0;
#endif
	vec2 bloodyCoords = splot.brushCoord.xy;
	
	float minZ = 0.35;
	float maxZ = 0.75;


	float inSplot = float(bleed >= max(abs(bloodyCoords.x), abs(bloodyCoords.y)));
	float inZee = step(minZ, (splot.brushCoord.z)) * (1.0-step(maxZ, splot.brushCoord.z)); 
	inSplot *= inZee;

	#ifdef CLONE_STAMP_DEST
		inSplot = 1.f;
	#endif

	float feather;
	
	//multi-sample very small brushes at any hardness, and large brushes when fully hard
#if !defined(USE_TEXTURE) && !defined(CLONE_STAMP_DEST)
	HINT_BRANCH
	if((1.0 - splot.hardness) < 5.0 * ddr)
	{
		//let's try just doing one sample, since distancewToValue multi-samples anyway.
		//TODO:  keep this if Joe approves
		float r0 = length(splot.brushCoord.xy);
//		float dR = ddr * 0.354; //brush-space AA delta, in brush radii
		float f1 = distanceToValue(r0, ddr, splot.hardness);
		feather = f1;
		
	}
	else
#endif
	{
		feather = sampleBrush( splot, ddr );
	} 

//		float f2 = distanceToValue(r0-dR, ddr, splot.hardness) * 0.5;
	total.y = max(total.y, splot.opacity * inSplot);
	feather *= inSplot;
		
	total.x = mix(total.x, 1.0, splot.flow*feather * step(0.0, feather));
	return splot.brushCoord.xy;
}


vec2 addBrushAlpha(SplotData splot, inout vec2 total)
{
	float bz = splot.brushCoord.z;
#ifdef USE_W
	bz /= splot.brushCoord.w;
	splot.brushCoord /= splot.brushCoord.w;
	splot.brushCoord.z = 0.5;
#endif
	//find the rate of change in brush radius per pixel
	splot.dCoordDx = dFdx(splot.brushCoord.xy);
	splot.dCoordDy = dFdy(splot.brushCoord.xy);
	
	//this early out is nearly identical to the one prior to calling this function but is necessary
	//for the dFdx functions below to work properly.  Culling area must be slightly smaller than the earlier cull

#ifndef CLONE_STAMP_DEST
	if( (1.0 - step(strokePadding * (1.0 + splot.warp * warpPadding) * .99, max(abs(splot.brushCoord.x), abs(splot.brushCoord.y)))) == 0.0)
	{ return splot.brushCoord.xy; }
#endif
	
//	minZ = -1.0; 
//	maxZ = 1.0; 
#ifdef USE_COMPENSATION_MAP
	float inRect = (1.0 - step(1.0, abs(splot.brushCoord.x))) * (1.0 - step(1.0, abs(splot.brushCoord.y)));
	vec4 indirection = texture2D(tUVLookup, splot.brushCoord.xy * 0.5 + 0.5);
	float idz = indirection.b * 2.0 - 1.0;
	//the indirection map also includes depth, so we can do occlusion! (it's also required)
#ifdef USE_W  //screenspace+screensize uses a much deeper projection matrix
	float bias = 0.00004;
#else
	float bias = 0.0001;
#endif
	if(inRect == 0.0 || indirection.b == 0.0 || idz <   - bias)		//b=0 means cull
	{ 
		return splot.brushCoord.xy; 
	}	
	
	//multiplier is so we can clearly indicate out-of-bounds in the indirection map
	splot.brushCoord.xy = mix(splot.brushCoord.xy, (vec2(indirection.x, 1.0-indirection.y) * 2.0 - 1.0) * INDIRECTION_MULTIPLIER, uUseLookup);
#endif	//USE_COMPENSATION_MAP

#ifndef CLONE_STAMP_DEST
	splot.brushCoord.xy = distortUV(splot.brushCoord.xy, splot.warp, splot.seed);
#endif

#ifdef PIXEL_MODE
	return samplePixelBrush(splot, total);
#else
	return samplePaintBrush(splot, total);
#endif
}

#ifdef USE_OVERLAY
vec4 makeOverlay(float brushVal, vec2 UV, vec2 brushCoord)
{
	float thresh = 0.1;
	int value = int(2047.0 * saturate(brushVal)) << 5; 
	float pixelRadius = uBrushRadius;
#ifdef PIXEL_MODE
	pixelRadius /= length(vec2(uTargetSize)) * 0.001;
#else
	
#endif	//PIXEL_MODE
	//the brush coord here is used to control padding around the brush.  make sure there's
	//some padding even for very small brushes
	float paddingMult = clamp(pixelRadius, 0.01, 3.0) * 0.3333;
	float coordDist = (length(brushCoord) * paddingMult - 1.5) * 0.5;
	coordDist = max(coordDist, 1.0 / 15.0);	//min value.  
	coordDist *= step(coordDist, 1.0); //zero is a flag to hide the grid.
	
	value += int(saturate(coordDist) * 15.0);	//4 bits of brush coordinates (radial distance)
	return vec4(float(value)/65535.0, 0.0, 0.0, 1.0);
}

#endif	//USE_OVERLAY

//transform a point into brush space
vec4 getBrushSpaceCoords(vec3 pos, mat4 model, mat4 post)
{
	vec4 brushSpace = mulPoint( model, pos ); 
	brushSpace.xyz = mulPoint(post, brushSpace.xyz/brushSpace.w).xyz*brushSpace.w;
	
	//fBrushCoord##n.z = mix(fBrushCoord##n.z, 0.5, uFake2D);	//flatten Z in UV painting
	return brushSpace;
}
