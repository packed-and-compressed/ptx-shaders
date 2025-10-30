#include "layer.sh"

#define IS_FXAA
#ifdef IS_FXAA

USE_TEXTURE2D( tTexture );

uniform float		uWidth;
uniform float		uHeight;

#define UP_LEFT      0
#define UP           1
#define UP_RIGHT     2
#define LEFT         3
#define CENTER       4
#define RIGHT        5
#define DOWN_LEFT    6
#define DOWN         7
#define DOWN_RIGHT   8

#define STEP_COUNT_MAX   12
float QUALITY(int i) 
{
    if (i < 5) return 1.0;
    if (i == 5) return 1.5;
    if (i < 10) return 2.0;
    if (i == 10) return 4.0;
    if (i == 11) return 8.0;

	return 0.0;
}

float RGB2LUMA(vec3 color) 
{
    return dot(vec3(0.299, 0.578, 0.114), color);
}

uniform float uEdgeThresholdMin;
uniform float uEdgeThresholdMax;
uniform float uSubpixelQuality;
uniform float uGradientScale;
uniform int uEnableFXAA;

#define EDGE_THRESHOLD_MIN  0.0312
#define EDGE_THRESHOLD_MAX  0.0625
#define SUBPIXEL_QUALITY    0.125
#define GRADIENT_SCALE      0.25

vec4 fxaa_3_11(vec2 uv, vec2 uv_step) 
{

	vec2 KERNEL_STEP_MAT[9] = 
	{
		vec2(-1.0, 1.0), vec2(0.0, 1.0), vec2(1.0, 1.0),
		vec2(-1.0, 0.0), vec2(0.0, 0.0), vec2(1.0, 0.0),
		vec2(-1.0, -1.0), vec2(0.0, -1.0), vec2(1.0, -1.0)
	};

    // get luma of kernel
    float luma_mat[9];
    for (int i = 0; i < 9; i++) 
	{
        luma_mat[i] = RGB2LUMA(texture2DLod( tTexture, uv + uv_step * KERNEL_STEP_MAT[i], 0.0).xyz);
    }
    
    // detecting where to apply FXAA, return the pixel color if not
    float luma_min = min(luma_mat[CENTER], min(min(luma_mat[UP], luma_mat[DOWN]), min(luma_mat[LEFT], luma_mat[RIGHT])));
    float luma_max = max(luma_mat[CENTER], max(max(luma_mat[UP], luma_mat[DOWN]), max(luma_mat[LEFT], luma_mat[RIGHT])));
    float luma_range = luma_max - luma_min;

    if(luma_range < max(uEdgeThresholdMin, luma_max * uEdgeThresholdMax)) 
		return texture2DLod( tTexture, uv, 0.0);
    
    // choosing edge tangent
    // horizontal: |(upleft-left)-(left-downleft)|+2*|(up-center)-(center-down)|+|(upright-right)-(right-downright)|
    // vertical: |(upright-up)-(up-upleft)|+2*|(right-center)-(center-left)|+|(downright-down)-(down-downleft)|

    float luma_horizontal = 
        abs(luma_mat[UP_LEFT] + luma_mat[DOWN_LEFT] - 2.0 * luma_mat[LEFT])
        + 2.0 * abs(luma_mat[UP] + luma_mat[DOWN] - 2.0 * luma_mat[CENTER])
        + abs(luma_mat[UP_RIGHT] + luma_mat[DOWN_RIGHT] - 2.0 * luma_mat[RIGHT]);

    float luma_vertical = 
        abs(luma_mat[UP_LEFT] + luma_mat[UP_RIGHT] - 2.0 * luma_mat[UP])
        + 2.0 * abs(luma_mat[LEFT] + luma_mat[RIGHT] - 2.0 * luma_mat[CENTER])
        + abs(luma_mat[DOWN_LEFT] + luma_mat[DOWN_RIGHT] - 2.0 * luma_mat[DOWN]);

    bool is_horizontal = luma_horizontal > luma_vertical;
    
    // choosing edge normal 
    float gradient_down_left = (is_horizontal ? luma_mat[DOWN] : luma_mat[LEFT]) - luma_mat[CENTER];
    float gradient_up_right = (is_horizontal ? luma_mat[UP] : luma_mat[RIGHT]) - luma_mat[CENTER];
    bool is_down_left = abs(gradient_down_left) > abs(gradient_up_right);
    
    // get the tangent uv step vector and the normal uv step vector
    vec2 step_tangent = (is_horizontal ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) * uv_step;
    vec2 step_normal =  (is_down_left ? -1.0 : 1.0) * (is_horizontal ? vec2(0.0, 1.0) : vec2(1.0, 0.0)) * uv_step;
    
    // get the change rate of gradient in normal per pixel
    float gradient = is_down_left ? gradient_down_left : gradient_up_right;
    
    // start at middle point of tangent edge
    vec2 uv_start = uv + 0.5 * step_normal;
    float luma_average_start = luma_mat[CENTER] + 0.5 * gradient;    

    // explore along tangent bidirectional until reach the edge both
    vec2 uv_pos = uv_start + step_tangent;
    vec2 uv_neg = uv_start - step_tangent;
    

    float delta_luma_pos = RGB2LUMA(texture2DLod( tTexture, uv_pos, 0.0).rgb) - luma_average_start;
    float delta_luma_neg = RGB2LUMA(texture2DLod( tTexture, uv_neg, 0.0).rgb) - luma_average_start;
    
    bool reached_pos = abs(delta_luma_pos) > uGradientScale * abs(gradient);
    bool reached_neg = abs(delta_luma_neg) > uGradientScale * abs(gradient);
    bool reached_both = reached_pos && reached_neg;
    
    if (!reached_pos) uv_pos += step_tangent;
    if (!reached_neg) uv_neg -= step_tangent;
    
	int i = 0;
    if (!reached_both) 
	{
        for( i = 2; i < STEP_COUNT_MAX; i++)
		{
            if(!reached_pos) delta_luma_pos = RGB2LUMA(texture2DLod( tTexture, uv_pos, 0.0).rgb) - luma_average_start;
            if(!reached_neg) delta_luma_neg = RGB2LUMA(texture2DLod( tTexture, uv_neg, 0.0).rgb) - luma_average_start;
            
            bool reached_pos = abs(delta_luma_pos) > GRADIENT_SCALE * abs(gradient);
            bool reached_neg = abs(delta_luma_neg) > GRADIENT_SCALE * abs(gradient);
            bool reached_both = reached_pos && reached_neg;
            
            if (!reached_pos) uv_pos += (QUALITY(i) * step_tangent);
            if (!reached_neg) uv_neg -= (QUALITY(i) * step_tangent);
            
            if (reached_both) break;
        }
    }
  
    // estimating offset
    float length_pos = max(abs(uv_pos - uv_start).x, abs(uv_pos - uv_start).y);
    float length_neg = max(abs(uv_neg - uv_start).x, abs(uv_neg - uv_start).y);
    bool is_pos_near = length_pos < length_neg;
    
    float pixel_offset = -1.0 * (is_pos_near ? length_pos : length_neg) / (length_pos + length_neg) + 0.5;
    
    // no offset if the bidirectional point is too far
    if(((is_pos_near ? delta_luma_pos : delta_luma_neg) < 0.0) == (luma_mat[CENTER] < luma_average_start)) 
		pixel_offset = 0.0;
    
    // subpixel antialiasing
    float luma_average_center = 0.0;
    float average_weight_mat[9] = 
	{
        1.0, 2.0, 1.0,
        2.0, 0.0, 2.0,
        1.0, 2.0, 1.0
    };
    for ( i = 0; i < 9; i++) 
	{
		luma_average_center += average_weight_mat[i] * luma_mat[i];
	}

    luma_average_center /= 12.0;
    
    float subpixel_luma_range = clamp(abs(luma_average_center - luma_mat[CENTER]) / luma_range, 0.0, 1.0);
    float subpixel_offset = (-2.0 * subpixel_luma_range + 3.0) * subpixel_luma_range * subpixel_luma_range;
    subpixel_offset = subpixel_offset * subpixel_offset * uSubpixelQuality;
    
    // use the max offset between subpixel offset with before
    pixel_offset = max(pixel_offset, subpixel_offset);
    
    
    return texture2DLod( tTexture, uv + pixel_offset * step_normal, 0.0 );
}

BEGIN_PARAMS
INPUT0( vec2, fBufferCoord )
OUTPUT_COLOR0( vec4 )
END_PARAMS
{
	vec2 sampleCoord = fBufferCoord;
	LayerState state = getLayerState( sampleCoord );

	vec3 sample = texture2DLod( tTexture, sampleCoord, 0.0 ).xyz;

	float2 div = float2(1.0 / uWidth, 1.0 / uHeight);

	vec3 value = fxaa_3_11(sampleCoord, div).xyz;

	state.result = vec4( value.xyz, 1.0 );	
	state.result = compositeLayerState( state );
	OUT_COLOR0 = state.result;
}
#endif
