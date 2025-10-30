#ifndef MSET_ERF_H
#define MSET_ERF_H

// error function (numerical approximation)
float erf( float x )
{
	// constants
	const float a1 = 0.254829592;
	const float a2 = -0.284496736;
	const float a3 = 1.421413741;
	const float a4 = -1.453152027;
	const float a5 = 1.061405429;
	const float p = 0.3275911;

	// save the sign of x
	int sign = 1;
	if( x < 0 )
		sign = -1;
	x = abs( x );

	const float t = 1 / ( 1 + p * x );
	const float y = 1 - ( ( ( ( ( a5 * t + a4 ) * t ) + a3 ) * t + a2 ) * t + a1 ) * t * exp( -x * x );
	return sign * y;
}


// inverse error function (also numerical approximation)
float erfinv( float x )
{
	float w, p;
	x = clamp( x, -0.99999, 0.99999 );
	w = -log( ( 1.0 - x ) * ( 1.0 + x ) );
	if( w < 5.000000 )
	{
		w = w - 2.500000;
		p = 2.81022636e-08;
		p = 3.43273939e-07 + p * w;
		p = -3.5233877e-06 + p * w;
		p = -4.39150654e-06 + p * w;
		p = 0.00021858087 + p * w;
		p = -0.00125372503 + p * w;
		p = -0.00417768164 + p * w;
		p = 0.246640727 + p * w;
		p = 1.50140941 + p * w;
	}
	else
	{
		w = sqrt( w ) - 3.000000;
		p = -0.000200214257;
		p = 0.000100950558 + p * w;
		p = 0.00134934322 + p * w;
		p = -0.00367342844 + p * w;
		p = 0.00573950773 + p * w;
		p = -0.0076224613 + p * w;
		p = 0.00943887047 + p * w;
		p = 1.00167406 + p * w;
		p = 2.83297682 + p * w;
	}
	return p * x;
}

#endif
