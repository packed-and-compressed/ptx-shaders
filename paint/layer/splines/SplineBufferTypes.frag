
#if defined(__cplusplus)
namespace mset
{
	
using packed_vec3 = cpr::packed_vec3;
using packed_vec4 = cpr::packed_vec4;
#define EQUALS(val) = val
#else
#define EQUALS(val)
#endif

//spline flags
#define SPLINE_FLAG_CCW 1
#define SPLINE_FLAG_LOOPED 2
#define SPLINE_FLAG_ROUND_START 4
#define SPLINE_FLAG_ROUND_END 8
#define SPLINE_FLAG_SYM_MIRROR 16
#define SPLINE_FLAG_SYM_JOINED 32

struct SplineBorderSegment
{
	packed_vec3				p1;
	packed_vec3				p2;
	int						rightHanded EQUALS(true);
	int						prevSegment EQUALS(-1);
	int						nextSegment EQUALS(-1);
	float					segLength;
#if defined(__cplusplus)
	SplineBorderSegment()
	: p1(0.f, 0.f, 0.f), p2(0.f, 0.f, 0.f)
	{ }
#endif

};


struct SplineSDFSegment
{
	packed_vec3 pos1;
	packed_vec3 pos2;
	packed_vec3 perp1;
	packed_vec3 perp2;
	packed_vec3 miterPerp;	//plane normal for precise mitering
	packed_vec3 miterApex;	//used to position the miter plane 
	float dist2 EQUALS(-1.f);
	float segLength EQUALS(-1.f);
	
	//lock distances:  this is used to modulate distortion near miters
	packed_vec4 wiggleDistance;
	
	float pathLength EQUALS(-1.f);
	int miter_and_flags EQUALS(0);
	float CCLookup[2];
#ifdef __cplusplus
	SplineSDFSegment()
	:pos1(0.f, 0.f, 0.f), pos2(0.f, 0.f, 0.f), perp1(0.f, 0.f, 0.f), perp2(0.f, 0.f, 0.f),
	miterPerp(0.f, 0.f, 0.f), miterApex(0.f, 0.f, 0.f), wiggleDistance(999.f, 999.f, 999.f, 999.f)
	{}
#endif
};

#if defined(__cplusplus)
}
#endif
