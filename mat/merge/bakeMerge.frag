#include "../state.frag"

//For baking, we define a post-merge method to finalize the result for a bake sample.
//This is done instead of the usual material Merge macro, since some state variables
//have to be adjusted by the baker beforehand. -jdr
void	BakeFinalize( inout FragmentState s )
{
	vec3 r = vec3(1,0,1);

	#if		defined(BAKE_ALBEDO)
		r = s.albedo.rgb;

	#elif	defined(BAKE_GLOSS)
		r = vec3(s.gloss,s.gloss,s.gloss);

	#elif	defined(BAKE_SPECULAR)
		r = s.reflectivity;

	#elif	defined(BAKE_ALBEDO_METALNESS)
		r = s.albedo.rgb;

	#elif	defined(BAKE_ROUGHNESS)
		float rough = 1.0 - s.gloss;
		r = vec3(rough,rough,rough);

	#elif	defined(BAKE_METALNESS)
		r = vec3(s.metalness, s.metalness, s.metalness);
	
	#elif	defined(BAKE_EMISSIVE)
		r = s.emission;
		float emissiveScale = max( r.x, max( r.y, r.z ) );
		if( emissiveScale > 1.0 )
		{ r /= emissiveScale; }

	#elif	defined(BAKE_TRANSPARENCY)
		r = s.albedo.aaa;

	#elif	defined(BAKE_NORMALS)
		r = 0.5 * s.normal + vec3(0.5,0.5,0.5);

	#endif

	s.output0.rgb = r;
	s.output0.a = 1.0;
}

