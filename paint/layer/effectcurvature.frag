#include "effect.frag"

#include "gradientmap.frag"
#include "layerinputprocessor.sh"

uniform float	uEdgeIntensity;
uniform float	uEdgeThickness;
uniform float	uCavityIntensity;
uniform float	uCavityThickness;
uniform vec2	uCurveClamp;

USE_PROCESSOR( CURVE )

float curveFunction( float curve )
{
	curve = 2.0 * curve - 1.0; 
	 
	float edge = curve;
	edge = max(0.0, edge - uCurveClamp.x) * uCurveClamp.y;	
	float thick;
	thick = 1.0 - uEdgeThickness;
	thick *= 0.5;
	thick = thick * 0.64 + 0.36;
	edge = pow(edge, thick);
	edge *= uEdgeIntensity;

	float cavity = -curve;
	cavity = max(0.0, cavity - uCurveClamp.x) * uCurveClamp.y;	
	thick = 1.0 - uCavityThickness;
	thick *= 0.5;
	thick = thick * 0.6 + 0.4;
	cavity = pow(cavity, thick);
	cavity *= uCavityIntensity;
	
	cavity = min( 1.0, edge + cavity );
	
	return cavity;	
}


vec4 runEffect(LayerState state)
{
	vec2 sampleCoord = state.bufferCoord;
	
	ProcessorParams proc = getProcessorParams( CURVE );	
	
	float origin = sampleInputGray( INPUT_CURVATURE, sampleCoord ).r; 
	origin = curveFunction( origin );

	float processedInput = origin;

	HINT_BRANCH
	if( proc.sharpness == 0.0 )
	{
		processedInput = processValue( origin, origin, proc );
	}
	else
	{
		float sum = blurInputGray( INPUT_CURVATURE, sampleCoord, proc  ).r;	
		processedInput = processValue( origin, sum, proc );
	}

	vec4 grade = applyGradientMapGray( processedInput );
	grade.a = 1.0;
	return grade;
}

vec4 finalizeEffect(LayerState state, inout float _blendAmount)
{ return state.result; }
