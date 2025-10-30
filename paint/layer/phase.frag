

float phaseValue(float value, float phase, float smoothing)
{
	float pv = value+phase;
	if( pv > 1 ) value = 1.0f - (pv - 1.0f);
	else value = pv;
	if( phase < 0.5f )
	{
		float minValue = phase;
		float maxValue = 1.0f;
		value = (value-minValue)/(maxValue-minValue);
	}
	else
	{
		float minValue = 1.0f-phase;
		float maxValue = 1.0f;
		value = (value-minValue)/(maxValue-minValue);
	}
	if( smoothing != 0 )
	{
		float d2r = 3.14159265359f / 180;
		float smoothValue = sin(value*90*d2r);
		value = (value * (1.0f-smoothing)) + (smoothValue * smoothing);
	}
	return value;
}
