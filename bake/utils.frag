#ifndef BAKE_UTILS_FRAG
#define	BAKE_UTILS_FRAG

uniform vec2	uTraceOffsetRange;
USE_TEXTURE2D(tTraceOffsetMask);
USE_TEXTURE2D(tTraceDirectionMask);

vec3	findTraceDirection( vec3 position, vec3 smoothNormal, vec2 uv )
{
	vec3 faceNormal = normalize( cross( ddx( position ), ddy( position ) ) );

	float traceBlend = texture2DLod( tTraceDirectionMask, uv, 0.0 ).x;

	if( dot(faceNormal, smoothNormal ) < 0.0 )
	{ faceNormal = -faceNormal; }
	
	vec3 diff = smoothNormal - faceNormal;
	float diffLen = length( diff );
	float maxLen = 1.414 * traceBlend;
	if( diffLen > maxLen )
	{ diff *= maxLen/diffLen; }
	vec3 dir = faceNormal + diff;

	return -normalize(dir);
}

vec3	findTraceOrigin( vec3 position, vec3 direction, vec2 uv )
{
	float offset = texture2DLod( tTraceOffsetMask, uv, 0.0 ).x;
	offset = uTraceOffsetRange.x + (uTraceOffsetRange.y-uTraceOffsetRange.x)*offset;

	vec3 origin = position - offset * direction;
	return origin;
}

#endif
