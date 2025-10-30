#if defined(KeyFormat8)
	#define USE_KEYBUFFER(name)						USE_TYPEDBUFFER(CPR_UINT8,name)
	#define USE_LOADSTORE_KEYBUFFER(name,id)		USE_LOADSTORE_TYPEDBUFFER(CPR_UINT8,name,id)
#elif defined(KeyFormat16)
	#define USE_KEYBUFFER(name)						USE_TYPEDBUFFER(CPR_UINT16,name)
	#define USE_LOADSTORE_KEYBUFFER(name,id)		USE_LOADSTORE_TYPEDBUFFER(CPR_UINT16,name,id)
#elif defined(KeyFormat32)
	#define USE_KEYBUFFER(name)						USE_TYPEDBUFFER(CPR_UINT32,name)
	#define USE_LOADSTORE_KEYBUFFER(name,id)		USE_LOADSTORE_TYPEDBUFFER(CPR_UINT32,name,id)
#else
	#define USE_KEYBUFFER(name)						USE_BUFFER(uint,name)
	#define USE_LOADSTORE_KEYBUFFER(name,id)		USE_LOADSTORE_BUFFER(uint,name,id)
#endif

#if defined(ValueFormat8)
	#define USE_VALUEBUFFER(name)					USE_TYPEDBUFFER(CPR_UINT8,name)
	#define USE_LOADSTORE_VALUEBUFFER(name,id)		USE_LOADSTORE_TYPEDBUFFER(CPR_UINT8,name,id)
#elif defined(ValueFormat16)
	#define USE_VALUEBUFFER(name)					USE_TYPEDBUFFER(CPR_UINT16,name)
	#define USE_LOADSTORE_VALUEBUFFER(name,id)		USE_LOADSTORE_TYPEDBUFFER(CPR_UINT16,name,id)
#elif defined(ValueFormat32)
	#define USE_VALUEBUFFER(name)					USE_TYPEDBUFFER(CPR_UINT32,name)
	#define USE_LOADSTORE_VALUEBUFFER(name,id)		USE_LOADSTORE_TYPEDBUFFER(CPR_UINT32,name,id)
#else
	#define USE_VALUEBUFFER(name)					USE_BUFFER(uint,name)
	#define USE_LOADSTORE_VALUEBUFFER(name,id)		USE_LOADSTORE_BUFFER(uint,name,id)
#endif
