#include "../common/util.sh"

uniform mat4	uModelViewMatrix;
uniform mat4	uProjectionMatrix;
uniform vec4	uColor;
uniform float	uScale;
uniform float	uFadeBackSide;
uniform float	uAlpha;

BEGIN_PARAMS
	INPUT0(vec4,vPosition)
	INPUT1(vec3,vTangent)
	INPUT2(float,vWidth)
	INPUT3(vec4,vColor)
	INPUT4(vec2,vTexCoord)

	OUTPUT0(vec2,fTexCoord)
	OUTPUT1(vec4,fColor)
END_PARAMS
{
	vec4 pos = vPosition;
	pos.xyz *= uScale;
	pos = mul( uModelViewMatrix, pos );

	vec3 tangent = mulVec( uModelViewMatrix, vTangent );
	vec3 eye = normalize( -pos.xyz );
	vec3 extend = normalize( cross( eye, tangent ) );
	pos.xyz += extend*vWidth*uScale;

	OUT_POSITION = mul( uProjectionMatrix, pos );

	vec4 color = vColor;
	color.xyz = mix( color.xyz, uColor.xyz, uColor.w );
	color.w *= uAlpha;

	if( uFadeBackSide > 0.0 )
	{
		//if this flag is set, "back" sides fade out
		float dp = dot( normalize(pos.xyz), normalize(mulVec( uModelViewMatrix, (vPosition * uScale).xyz )) );
		color *= clamp( 1.5 - 4.0*dp, 0.2, 1.0 );
	}

	fColor.rgb = color.rgb * color.w;
	fColor.a = color.w;
	
	fTexCoord = vTexCoord;
}