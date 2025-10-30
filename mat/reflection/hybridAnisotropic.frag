#include "data/shader/common/octpack.sh"
#include "data/shader/common/packed.sh"
#include "data/shader/mat/hybridConstants.comp"
#include "data/shader/mat/reflection/sampleAnisotropic.frag"

uint2 ReflectionAnisoGGXSample( in PathState path, in FragmentState fs, inout SampleState ss, inout uint specularLobe )
{
	float roughness = 1.0 - _p( fs.gloss );
	vec3  a = anisoRoughnessToA( roughness, _p( fs.anisoAspect ) );

	vec3  basisX, basisY;
#ifdef MATERIAL_TEXTURE_MODE_TRIPLANAR
	anisoGetBasis( ss.basis, fs.vertexTexCoord.projectorToShadingRotation, _p( fs.anisoDirection ), basisX, basisY );
#else
	anisoGetBasis( ss.basis, _p( fs.anisoDirection ), basisX, basisY );
#endif

	if( path.isNonSpecular )
	{
		regularizeAnisoGGX( a );
	}

	sampleBRDF_AnisoGGX( ss, a.x, a.y, basisX, basisY );
	ss.flagSpecular = isSpecularGGX( a.z );

	// additional hybrid
	specularLobe |= HYBRID_ANISOTROPIC_FLAG;
#if defined( ReflectionSampleSecondary )
	fs.sampledGloss = fs.glossSecondary;
#else
	fs.sampledGloss = fs.gloss;
#endif
	// variance, packed anisotropy, tangent basis, bitangent basis
	// 8 bit, 8 + 8, 16, 16
	a.x = clamp( a.x, -1.0f, 1.0f ) * 0.5f + 0.5f;
	a.y = clamp( a.y, -1.0f, 1.0f ) * 0.5f + 0.5f;
	const uint packedVariance = packUnitFloat( 0.1f );
	const uint packedAnisotropyX = a.x * 255;
	const uint packedAnisotropyY = a.y * 255;
	const uint packedAnisotropy = uint( ( packedAnisotropyX << 8 ) | ( packedAnisotropyY & 0xFF ) );
	const uint packedData = ( packedVariance << 16 ) | packedAnisotropy;
	return uint2( packedData, ( packUnitVectorOct16bit( basisX ) << 16 ) | packUnitVectorOct16bit( basisY ) );
}