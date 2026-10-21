/** Educational worksheets: decimal GB, explicit assumptions, no provider throughput claims. */
function finiteNonnegative(values: number[]) {
  if (values.some((value) => !Number.isFinite(value) || value < 0))
    throw new RangeError('Inputs must be finite and nonnegative');
}
export function feedCapacity(input: {
  users: number; postsPerUser: number; readsPerUser: number; followers: number;
  cachedIds: number; bytesPerId: number; peak: number; pushFraction: number;
}) {
  finiteNonnegative(Object.values(input));
  if (input.pushFraction > 1) throw new RangeError('Push fraction must be between zero and one');
  const writes = input.users * input.postsPerUser / 86400;
  const reads = input.users * input.readsPerUser / 86400;
  return {
    writes, reads, peakReads: reads * input.peak,
    fanout: writes * input.followers * input.pushFraction,
    cacheGB: input.users * input.cachedIds * input.bytesPerId / 1e9,
    amplification: input.followers * input.pushFraction,
  };
}
export function kvCapacity(input: {
  layers: number; kvHeads: number; headDimension: number; bytes: number;
  tokens: number; sequences: number; memoryGB: number;
}) {
  finiteNonnegative(Object.values(input));
  const bytesPerToken = 2 * input.layers * input.kvHeads * input.headDimension * input.bytes;
  const perSequenceGB = bytesPerToken * input.tokens / 1e9;
  return {
    bytesPerToken, perSequenceGB,
    totalGB: perSequenceGB * input.sequences,
    maxSequences: perSequenceGB > 0 ? Math.floor(input.memoryGB / perSequenceGB) : 0,
  };
}
export function decodeRoofline(input:{parameters:number;weightBytes:number;batch:number;context:number;kvBytesPerToken:number;bandwidthGBs:number;computeTFLOPs:number;memoryGB:number}){
  finiteNonnegative(Object.values(input));
  if(input.batch<1||input.bandwidthGBs<=0||input.computeTFLOPs<=0)throw new RangeError('Positive batch, bandwidth and compute required');
  const weightBytes=input.parameters*input.weightBytes;
  const kvBytes=input.batch*input.context*input.kvBytesPerToken;
  const movedBytes=weightBytes+kvBytes;
  const flops=2*input.parameters*input.batch;
  const memorySeconds=movedBytes/(input.bandwidthGBs*1e9);
  const computeSeconds=flops/(input.computeTFLOPs*1e12);
  const seconds=Math.max(memorySeconds,computeSeconds);
  return {memorySeconds,computeSeconds,stepSeconds:seconds,intensity:flops/movedBytes,
    perUserTokens:1/seconds,totalTokens:input.batch/seconds,
    kvGB:kvBytes/1e9,totalGB:movedBytes/1e9,fits:movedBytes<=input.memoryGB*1e9};
}
export function contextBudget(input:{window:number;system:number;history:number;evidence:number;tools:number;output:number}){
  finiteNonnegative(Object.values(input));
  const required=input.system+input.history+input.evidence+input.tools+input.output;
  return {required,remaining:input.window-required,fits:required<=input.window};
}
export function availabilityBudget(percent:number,days:number){
  finiteNonnegative([percent,days]);if(percent>100)throw new RangeError('Availability cannot exceed 100%');
  return (1-percent/100)*days*86400;
}
export function mm1Queue(arrival:number,service:number){
  finiteNonnegative([arrival,service]);if(service<=0)throw new RangeError('Positive service rate required');
  if(arrival>=service)return {stable:false,utilization:arrival/service,meanSeconds:null,meanJobs:null};
  return {stable:true,utilization:arrival/service,meanSeconds:1/(service-arrival),meanJobs:arrival/(service-arrival)};
}
export function requestHandshake(mode:'tcp-tls'|'quic'|'reuse',rttMs:number,dnsMs:number,serverMs:number){
  finiteNonnegative([rttMs,dnsMs,serverMs]);
  return {dns:mode==='reuse'?0:dnsMs,transport:mode==='tcp-tls'?rttMs:0,
    crypto:mode==='reuse'?0:rttMs,request:rttMs,server:serverMs,
    total:(mode==='reuse'?0:dnsMs)+(mode==='tcp-tls'?2*rttMs:mode==='quic'?rttMs:0)+rttMs+serverMs};
}
