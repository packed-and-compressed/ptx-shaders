#ifndef MSET_MICROFACET_DISTRIBUTION_FRAG
#define MSET_MICROFACET_DISTRIBUTION_FRAG

#define GGX_MIN_ALPHASQR 1e-6
#define GGX_MIN_ALPHAXY  1e-4

// This file contains common microfacet distribution functions

// Isotropic height-correlated Smith geometric masking-shadowing for GGX.
// NOTE: Some terms cancelled out with BxDF normalization terms
//       should be multiplied by a factor of 0.5 for BRDFs and 2.0 for BTDFs
// TODO: This method is used for both isotropic and anisotropic BxDF evaluations.
//       We should consider checking if anisotropic materials look better when
//       using anisotropic formulas.
//       -bs
float G2Smith_GGX( float NdotL, float NdotV, float alpha2 )
{
	float dL = abs( NdotV ) * sqrt( NdotL*NdotL * (1.0 - alpha2) + alpha2 );
	float dV = abs( NdotL ) * sqrt( NdotV*NdotV * (1.0 - alpha2) + alpha2 );
	return rcp( dL + dV );
}

// Isotropic height-correlated Smith geometric masking for GGX.
// NOTE: Full form.
// NOTE: This method implements the normalization factor for back-facng normals accoring to the following paper.
//       This translates to a particular used of `abs` in the formula below. See paper for details.
//       "Unbiased VNDF Sampling for Backfacing Shading Normals", 2021, Yusuke Tokuyoshi
//       https://gpuopen.com/download/publications/Unbiased_VNDF_Sampling_for_Backfacing_Shading_Normals.pdf
// TODO: This method is used for both isotropic and anisotropic BxDF evaluations.
//       We should consider checking if anisotropic materials look better when
//       using anisotropic formulas.
//       -bs
float G1Smith_GGX( float NdotV, float alpha2 )
{
	float denom = sqrt( alpha2 + (1.0 - alpha2) * NdotV * NdotV ) + NdotV;
	return 2.0 * abs( NdotV ) * rcp( denom );
}

// Trowbridge-Reitz (GGX) isotropic normal distribution function.
// NOTE: The code below can be improved to work better in half-float arithmetic. See the following links.
//       https://google.github.io/filament/Filament.md.html#materialsystem/specularbrdf/normaldistributionfunction(speculard)
//       https://gist.github.com/romainguy/a2e9208f14cae37c579448be99f78f25
float NDF_GGX( float NdotH, float alpha2 )
{
	float denom = ( NdotH * NdotH ) * ( alpha2 - 1.0 ) + 1.0;
	return alpha2 / ( PI * denom * denom );
}

#endif
