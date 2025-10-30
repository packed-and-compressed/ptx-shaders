#define FFX_PARALLELSORT_SORT_BITS_PER_PASS		4
#define	FFX_PARALLELSORT_SORT_BIN_COUNT			(1u << FFX_PARALLELSORT_SORT_BITS_PER_PASS)
#define FFX_PARALLELSORT_ELEMENTS_PER_THREAD	4
#define FFX_PARALLELSORT_THREADGROUP_SIZE		128

//////////////////////////////////////////////////////////////////////////
// ParallelSort constant buffer parameters:
//
//	NumKeys								The number of keys to sort
//	Shift								How many bits to shift for this sort pass (we sort 4 bits at a time)
//	NumBlocksPerThreadGroup				How many blocks of keys each thread group needs to process
//	NumThreadGroups						How many thread groups are being run concurrently for sort
//	NumThreadGroupsWithAdditionalBlocks	How many thread groups need to process additional block data
//	NumReduceThreadgroupPerBin			How many thread groups are summed together for each reduced bin entry
//	NumScanValues						How many values to perform scan prefix (+ add) on
//////////////////////////////////////////////////////////////////////////
#if defined(__cplusplus)
	using uint = unsigned;
#endif
struct FFX_ParallelSortCB
{
	uint NumKeys;
	int  NumBlocksPerThreadGroup;
	uint NumThreadGroups;
	uint NumThreadGroupsWithAdditionalBlocks;
	uint NumReduceThreadgroupPerBin;
	uint NumScanValues;
};

#if defined(__cplusplus)
	void FFX_ParallelSort_CalculateScratchResourceSize(uint32_t MaxNumKeys, uint32_t& ScratchBufferSize, uint32_t& ReduceScratchBufferSize)
	{
		uint32_t BlockSize = FFX_PARALLELSORT_ELEMENTS_PER_THREAD * FFX_PARALLELSORT_THREADGROUP_SIZE;
		uint32_t NumBlocks = (MaxNumKeys + BlockSize - 1) / BlockSize;
		uint32_t NumReducedBlocks = (NumBlocks + BlockSize - 1) / BlockSize;

		ScratchBufferSize = FFX_PARALLELSORT_SORT_BIN_COUNT * NumBlocks * sizeof(uint32_t);
		ReduceScratchBufferSize = FFX_PARALLELSORT_SORT_BIN_COUNT * NumReducedBlocks * sizeof(uint32_t);
	}
	void FFX_ParallelSort_SetConstantAndDispatchData(uint32_t NumKeys, uint32_t MaxThreadGroups, FFX_ParallelSortCB& ConstantBuffer, uint32_t& NumThreadGroupsToRun, uint32_t& NumReducedThreadGroupsToRun)
	{
		ConstantBuffer.NumKeys = NumKeys;

		uint32_t BlockSize = FFX_PARALLELSORT_ELEMENTS_PER_THREAD * FFX_PARALLELSORT_THREADGROUP_SIZE;
		uint32_t NumBlocks = (NumKeys + BlockSize - 1) / BlockSize;

		// Figure out data distribution
		NumThreadGroupsToRun = MaxThreadGroups;
		uint32_t BlocksPerThreadGroup = (NumBlocks / NumThreadGroupsToRun);
		ConstantBuffer.NumThreadGroupsWithAdditionalBlocks = NumBlocks % NumThreadGroupsToRun;

		if (NumBlocks < NumThreadGroupsToRun)
		{
			BlocksPerThreadGroup = 1;
			NumThreadGroupsToRun = NumBlocks;
			ConstantBuffer.NumThreadGroupsWithAdditionalBlocks = 0;
		}

		ConstantBuffer.NumThreadGroups = NumThreadGroupsToRun;
		ConstantBuffer.NumBlocksPerThreadGroup = BlocksPerThreadGroup;

		// Calculate the number of thread groups to run for reduction (each thread group can process BlockSize number of entries)
		NumReducedThreadGroupsToRun = FFX_PARALLELSORT_SORT_BIN_COUNT * ((BlockSize > NumThreadGroupsToRun) ? 1 : (NumThreadGroupsToRun + BlockSize - 1) / BlockSize);
		ConstantBuffer.NumReduceThreadgroupPerBin = NumReducedThreadGroupsToRun / FFX_PARALLELSORT_SORT_BIN_COUNT;
		ConstantBuffer.NumScanValues = NumReducedThreadGroupsToRun;	// The number of reduce thread groups becomes our scan count (as each thread group writes out 1 value that needs scan prefix)
	}
	// We are using some optimizations to hide buffer load latency, so make sure anyone changing this define is made aware of that fact.
	static_assert(FFX_PARALLELSORT_ELEMENTS_PER_THREAD == 4, "FFX_ParallelSort Shaders currently explicitly rely on FFX_PARALLELSORT_ELEMENTS_PER_THREAD being set to 4 in order to optimize buffer loads. Please adjust the optimization to factor in the new define value.");
#else
	#ifndef FFX_PARALLELSORT_NOPARAMSBUFFER
		USE_STRUCTUREDBUFFER(FFX_ParallelSortCB,bParams);
		FFX_ParallelSortCB FFX_GetParams()
		{
			return bParams[0];
		}
	#endif
#endif
