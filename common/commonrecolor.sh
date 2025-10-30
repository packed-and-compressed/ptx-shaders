#ifndef RECOLOR_SH
#define RECOLOR_SH

#if defined(__cplusplus)
namespace mset
{

using uint = unsigned;
using packed_vec3 = cpr::packed_vec3;
using packed_vec4 = cpr::packed_vec4;

class CommonRecolor 
{
public:

	static constexpr float EPSILON				= 0.0001f;
	static const unsigned  sMinimumMainColors	= 1;
	static const unsigned  sCount				= 10;
	static const unsigned  sInitialCount		= 3;
	static constexpr float sCustomModeDefaultTolerance = 0.2f;

#else

	// The range must be [INT32_MIN, INT32_MAX] as interlock buffers are signed integers
	#define INT32_MIN				-(1<<31)
	#define INT32_MAX				(1<<31) - 1

	#define EPSILON					0.0001f
	#define sCount					10
	#define sMinimumMainColors		1

#endif

	// ------------------------------------------------------------------------------------------
	struct SearchMainColor
	{
		int		mTexelCount;
		int		mColorId;

		// During the main colors research, some colors can be too close from previously detected main colors' influence spheres 
		// to be selected by the usual research.
		// However if they have an important enough proportion, we still want to be able to select them.
		// 
		// So, when we are searching for the "next best main color", we paralally search for a "supplementary" color : 
		// the color with the largest proportion among the colors too close to a main color's sphere influence to be usually selected.
		// 
		// At the end of the "next best main color" research, we compare the last found main color proportion with the proportion of this "supplementary" color 
		// (proportion only considered at the color voxel, not within its influence sphere) 
		// If the "supplementary" color has the largest proportion, it is selected as the "next best main color" 
		// (and its total proportion will be computed within its influence sphere)

		int		mTexelCountSuppl;
		int		mColorIdSuppl;
		float	mMaxThresholdSuppl;
	};

	// ------------------------------------------------------------------------------------------
	// Structure for CS, need integers only to call interlockedMax / interlockedAdd
	struct MainColorCS
	{
#if defined(__cplusplus)
		MainColorCS();
		void reset();
#endif

		int		mAroundColorPixelCount;
		int		mAroundColorAverageRGB[3];
		int		mMaxLinearDist;
	};

	#define OUTPUT_COLOR_SIZE				5
	#define OUTPUT_TEXELS_COUNT_POS			0
	#define OUTPUT_AVERAGE_RGB_POS			1
	#define OUTPUT_MAX_LINEAR_DIST_POS		4

#if defined(__cplusplus)
	static void reset(MainColorCS& mainColorCS)
#else
	void reset(inout MainColorCS mainColorCS)
#endif
	{
		mainColorCS.mAroundColorPixelCount = 0; 
		mainColorCS.mMaxLinearDist = 0;
		mainColorCS.mAroundColorAverageRGB[0] = INT32_MIN;
		mainColorCS.mAroundColorAverageRGB[1] = INT32_MIN;
		mainColorCS.mAroundColorAverageRGB[2] = INT32_MIN;
	}
	
	// ------------------------------------------------------------------------------------------
	struct ColorData
	{
        packed_vec3				mTargetColor;
		float					mTolerance;
		float					mContrast;
		int						mHasTargetColor;
		int						mVisibility;
		int						mInvert;

		// Only for Custom Colors mode
        packed_vec3				mCustomColor;
		int						mHasCustomColor;

		// Only for Multiple Colors mode
        packed_vec3				mRefAverageColor;
		float					mRefProps;
		float					mRefDistThreshold;

#if defined(__cplusplus)
		ColorData();
		void	reset(bool isCustomColor = false);
		bool	averageDataInitialized() const;
		void	updateHash(MathUtil::uint64& hash) const;
		bool	hasTargetColor() const;
		void	read(Serializer& s);
		void	write(Serializer& s) const;
#endif
	};

	bool discardColor(ColorData colorData, bool mainColorFound)
	{
		const bool noContrast = ( abs(colorData.mContrast-1.f) < EPSILON );
		return ( !colorData.mVisibility || (!colorData.mHasTargetColor && !colorData.mInvert && noContrast) || !mainColorFound );
	}

	// ------------------------------------------------------------------------------------------
	struct MainColor
	{
        packed_vec3	mAroundColorAverageRGB;
		float	    mAroundColorProp;
		float	    mMaxColorProp;
		int		    mIsMean;

		float	    mFoundCurrentColor;
        packed_vec3	mCurrentColorHSV;
		float	    mMaxLinearDist;

		float	    mCurrentThreshold;
		float	    mMaxThreshold;
		float	    mAllLimitThreshold;

#if defined(__cplusplus)
		MainColor();
		void	reset();
		void	read(Serializer& s);
		void	write(Serializer& s) const;
#endif
	};

#if !defined(__cplusplus)
	void reset(inout MainColor mainColor)
	{
		mainColor.mAroundColorAverageRGB = vec3(0.f, 0.f, 0.f);
        
		mainColor.mAroundColorProp = 0.f;
		mainColor.mMaxColorProp = 0.f;
		mainColor.mIsMean = 0;

		mainColor.mFoundCurrentColor = 0.f;
    
        mainColor.mCurrentColorHSV = vec3(0.f, 0.f, 0.f);
        
		mainColor.mMaxLinearDist = 0.f;
		mainColor.mCurrentThreshold = 0.f;
		mainColor.mMaxThreshold = 0.f;
		mainColor.mAllLimitThreshold = 0.f;
	}
#endif

	// ------------------------------------------------------------------------------------------
	struct MeanColor
	{
        packed_vec3 mMeanRGB;
        packed_vec3	mMeanPartialRGB;
        packed_vec3	mMeanHSV;
		uint		mTexelCount;

        packed_vec3	mRefMeanHSV;
        packed_vec3	mRefMeanPartialRGB;

#if defined(__cplusplus)
		MeanColor();
		void reset();
#endif
	};

	// ------------------------------------------------------------------------------------------
	// Keep in mind that we have "three" levels of colors here :
	// 1. The main colors list resulting from the histogram analysis (maximum sCount found main colors)
	// 2. The destination colors (sub list of the main colors list) used to group main colors according to the user colors count (UI spinner)
	// 3. The target colors chosen by the user (UI) to recolor each group of colors
	//
	// To navigate between these 3 levels, we need some help, provided by the GroupData structure
	struct GroupData
	{
#if defined(__cplusplus)
		GroupData();
		void reset();
#endif

		// For each main color (resulting from histogram analysis), the main "destination" color id with which the color is regrouped.
		// (If regrouped. Else, mDestColorIds[i] == i)
		int		mDestColorIds[sCount];

		// All the main destination colors ids present in mDestColorIds, but sorted and unique (as in a std::set)
		// End of the set at the first -1 value.
		int     mSetDestColorIds[sCount];

		// For each main color, the corresponding "UI line" / target color id
		// Can also be seen as the current destination color count
		// With these values, we know which EffectRecolor::mColorsList[modeId].mColorsData[id] we must apply for the current main color i
		// with id = mUITargetColorIds[i]
		int		mUITargetColorIds[sCount];

		// Can be true for some main colors when the group counts is superior to the user color counts
		// In such case, some colors are "ignored / not recolorized with any target color" (when the destination color count is superior to the user color counts)
		int		mMainColorIgnored[sCount];

		// False if at least one color is ignored 
		int		mSucessRegroup;

		// Here is one example of regroupements of main colors.
		// 
		// color	9		has been grouped	with the destination color 0
		// color	6		has been grouped	with the destination color 1
		// colors	{4, 8}	have been grouped	with the destination color 2
		// color	7		has been grouped	with the destination color 3
		// color	5		is not grouped
		// 
		// 0 -> 0
		// 1 -> 1
		// 2 -> 2
		// 3 -> 3
		// 4 -> 2
		// 5 -> 5
		// 6 -> 1
		// 7 -> 3
		// 8 -> 2
		// 9 -> 0
		//
		// mDestColorIds	 = { 0, 1, 2, 3, 2, 5, 1, 3, 2, 0 }
		// mSetDestColorIds  = { 0, 1, 2, 3, 5 }
		// mUITargetColorIds = { 0, 1, 2, 3, 2, 4, 1, 3, 2, 0 }

		// One last redirection is done in histogramRecolor.comp / INIT_PS_DATA
		// to sort the main colors by the dest color id :
		// { 0, 9, 1, 6, 2, 4, 8, 3, 7, 5 }
		// The main colors linked to the same target color (/grouped to the same destination color) must be adjacent in the final colors list when we apply the PS recolorization
		// They must be adjacent in the final main colors list (sent to the recolorization PS) 
		// Example here  : if we don't apply this final sorting, and if we increase a lot the tolerance slider corresponding to destination color 2 ( == colors { 2, 4, 8} ),
		// color 3 could be recovered by the recolorization of destination color 2 (because of colors 4 and 8, recolored further color 3 in the colors list PS loop)
	};

#if defined(__cplusplus)
	static void reset(GroupData& groupData)
#else
	void reset(inout GroupData groupData)
#endif
	{
		for( uint i = 0; i < sCount; ++i )
		{
			groupData.mDestColorIds[i] = i;
			groupData.mSetDestColorIds[i] = -1;
			groupData.mUITargetColorIds[i] = -1;
			groupData.mMainColorIgnored[i] = 0;
		}

		groupData.mSucessRegroup = 0;
	}

	// ------------------------------------------------------------------------------------------
    struct WrapPackedVec3
    {
        packed_vec3 v;

#if defined(__cplusplus)
        WrapPackedVec3();
		WrapPackedVec3(const float* f);

		float* getData() { return &v.x;}
		const float* getData() const { return &v.x;}
		float operator[]( unsigned i ) const { return getData()[i]; }
#endif
    };

    struct UIData
	{
        packed_vec3		mMeanRGB;
		uint			mFoundMainColorsCount;
		uint			mMaxGroupsCount;
		uint			mGroupsCount;
		uint			mSelectedColorId;
		uint			mColorPossibleLink[sCount];
		float			mColorsDistance;
		int				mCheckUpToDate;

        // I need a wrapper to be able to explicitly initialize the sCount packed_vec3 :(
        WrapPackedVec3	mAverageGroupColors[sCount];
		float			mAverageGroupProps[sCount];
		float			mAverageGroupMaxProps[sCount];
		float			mTotalProps;
		float			mTotalMaxProps;

		uint			mMeanId;
        packed_vec3		mPrimaryColor;

		// Debug only
		WrapPackedVec3	mMainColors[sCount];
		float			mProps[sCount];

#if defined(__cplusplus)
		UIData();
		void reset();
#endif
	};

	// ------------------------------------------------------------------------------------------
	struct PixelShaderGlobalData
	{
        packed_vec3	mRefColorPartialRGB;
        packed_vec3	mRefColorHSV;
		float	    mAllDiscard;
		float	    mInvertGlobalLocal;

#if defined(__cplusplus)
		PixelShaderGlobalData();
#endif
	};
 
 #if !defined(__cplusplus)
    void reset(inout PixelShaderGlobalData pixelShaderGlobalData)
    {
        pixelShaderGlobalData.mRefColorPartialRGB = vec3(0.f, 0.f, 0.f);
        pixelShaderGlobalData.mRefColorHSV = vec3(0.f, 0.f, 0.f);
        pixelShaderGlobalData.mAllDiscard = 0.f;
        pixelShaderGlobalData.mInvertGlobalLocal = 0.f;
    };
#endif

	// ------------------------------------------------------------------------------------------
	struct PixelShaderColorData
	{
        packed_vec4	mGoalPartialRGBAndDiscard;
        packed_vec4	mSVParams;
        packed_vec4	mRefHSVAndCurveParam;

		// For Local Mode or DEBUG Multiple Colors
		float       mMaxThreshold;

		// DEBUG - be careful if remove these params, seems to increase a lot the GPU time for the PS recolorization
		float       mInitThreshold;
		float       mFound;

		// It works if I don't add this padding but a lot more expensive on GPU!
		float       mPadding;

#if defined(__cplusplus)
		PixelShaderColorData();
#endif
	};
 
#if !defined(__cplusplus)
    void reset(inout PixelShaderColorData pixelShaderColorData)
    {
        pixelShaderColorData.mGoalPartialRGBAndDiscard = vec4(0.f, 0.f, 0.f, 0.f);
        pixelShaderColorData.mSVParams = vec4(0.f, 0.f, 0.f, 0.f);
        pixelShaderColorData.mRefHSVAndCurveParam = vec4(0.f, 0.f, 0.f, 0.f);
        pixelShaderColorData.mMaxThreshold = 0.f;

        pixelShaderColorData.mInitThreshold = 0.f;
        pixelShaderColorData.mFound = 0.f;
    };
#endif
    
#if defined(__cplusplus)
};
}
#endif

#endif //RECOLOR_SH
