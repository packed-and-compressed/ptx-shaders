//This shader collects geometry at the location of the paint splot, which is then
//used to compensate for distortion 

BEGIN_PARAMS
    INPUT0(vec3,fNormal)
    INPUT1(vec4,fLocalCoord)
	
	OUTPUT_COLOR0(vec4)
	OUTPUT_COLOR1(vec4)
END_PARAMS
{
	OUT_COLOR0.rgb = fNormal;// * 0.5 + 0.5;
	OUT_COLOR0.a = 1.0;
	OUT_COLOR0.rgb = normalize(fNormal).rgb * 0.5 + 0.5;
	
	OUT_COLOR1.rgb = fLocalCoord.xyz/fLocalCoord.w * 0.5 + 0.5;
	OUT_COLOR1.a = IN_POSITION.z;

//	OUT_COLOR0.rgb = vec3(0.5-0.5*cos(fLocalCoord.z/fLocalCoord.w * 100.0));
	
}
