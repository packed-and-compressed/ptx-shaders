#ifndef MSET_SCREEN_SPACE_RAY_TRACE_H
#define	MSET_SCREEN_SPACE_RAY_TRACE_H

#ifndef SCREEN_TRACE_STEPS
#define SCREEN_TRACE_STEPS			64
#endif
#ifndef SCREEN_TRACE_REFINE_STEPS
#define SCREEN_TRACE_REFINE_STEPS	16
#endif
#ifndef SCREEN_TRACE_BIAS
#define SCREEN_TRACE_BIAS 			0.0
#endif

#include "../common/util.sh"

USE_TEXTURE2D(tScreenDepth);

uniform vec4  uScreenColorSize; // { w, h, 1/w, 1/h }
uniform mat4  uScreenTraceProjectionMatrix;
uniform float uScreenTraceMaxDistance;

vec2	posToNDC( vec3 p )
{
	vec4 pp = mulPoint( uScreenTraceProjectionMatrix, p );
	return pp.xy / pp.w;
}

vec2	NDCToTexCoord( vec2 ndc )
{
	#ifdef RENDERTARGET_Y_DOWN
		return vec2(0.5,-0.5)*ndc + vec2(0.5,0.5);
	#else
		return vec2(0.5, 0.5)*ndc + vec2(0.5,0.5);
	#endif
}

bool	rangeIntersect( float anear, float afar, float bnear, float bfar )
{
	return afar <= bnear && anear >= bfar;
}

void	traceRay( vec3 pos, vec3 dir, out vec2 coords, out float mask )
{
	//ray march settings
	float maxDist = abs(pos.z)*rsqrt(0.01 + saturate(dot(dir.xy,dir.xy)));
	maxDist = min( maxDist, uScreenTraceMaxDistance );
	float incr = maxDist/float(SCREEN_TRACE_STEPS);
	float incrRefine = incr/float(SCREEN_TRACE_REFINE_STEPS);
	float bias = SCREEN_TRACE_BIAS * incrRefine;
	maxDist += bias;

	bool under = false, hit = false;
	vec2 tc;
	float edge = 0.0;
	HINT_LOOP
	for( float t=incr+bias; t<=maxDist && !hit && edge < 1.0; t+=incr )
	{
		//view space ray march location
		vec3 p = pos + t*dir;

		//convert to screen texture coordinates
		tc = NDCToTexCoord( posToNDC( p ) );

		//coarse sample
		float depth = texture2DLod( tScreenDepth, tc, 0.0 ).x;

		//coarse intersection check
		bool wasUnder = under;
		under = p.z < depth;
		HINT_BRANCH
		if( !wasUnder && under )
		{
			float best = depth - p.z;
			float t2 = t - incr;
			
			HINT_UNROLL
			for( int i=0; i<SCREEN_TRACE_REFINE_STEPS; ++i )
			{
				t2 += incrRefine;
				vec3 p2 = pos + t2*dir;
				vec2 tc2 = NDCToTexCoord( posToNDC( p2 ) );

				float d2 = texture2DLod( tScreenDepth, tc2, 0.0 ).x;
				float diff = d2 - p2.z;
				HINT_FLATTEN
				if( diff >= 0.0 && diff < best )
				{
					best = diff;
					tc = tc2;
				}
			}

			hit = best < (0.25*incr);
		}

		//edge fade
		edge = max( abs(2.0*tc.x-1.0), abs(2.0*tc.y-1.0) );
	}

	//snap texcoords to nearest texel
	tc = (floor(tc * uScreenColorSize.xy) + vec2(0.5,0.5)) * uScreenColorSize.zw;
	
	//output final values
	coords = hit ? tc : vec2(0.0,0.0);
	mask = hit ? saturate( 8.0 - 8.0*edge ) : 0.0;
}

#endif