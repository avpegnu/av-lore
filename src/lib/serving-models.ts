// Synthetic occupancy model: one output token/active sequence/unit tick.
// No prefill, KV limits, hardware timings or changing step cost are modeled here.
export const servingJobs=[{id:'A',arrival:0,tokens:6},{id:'B',arrival:0,tokens:2},{id:'C',arrival:1,tokens:2},{id:'D',arrival:2,tokens:3},{id:'E',arrival:3,tokens:1}];
export function batchOccupancy(slots:number,mode:'static'|'continuous'){
 if(!Number.isInteger(slots)||slots<1||slots>4)throw new RangeError('Bounded slots required');
 const jobs=servingJobs.map(j=>({...j,remaining:j.tokens,first:0,done:0}));
 let active:string[]=[],tick=0,produced=0;const admitted=new Set<string>(),timeline:{tick:number;active:string[];produced:number}[]=[];
 while(jobs.some(j=>j.remaining>0)){
  if(mode==='continuous'||active.length===0){
   const room=slots-active.length;
   const ready=jobs.filter(j=>j.arrival<=tick&&!admitted.has(j.id)).slice(0,room);
   for(const job of ready){active.push(job.id);admitted.add(job.id);}
  }
  const running=jobs.filter(j=>active.includes(j.id)&&j.remaining>0);
  for(const job of running){job.remaining--;produced++;if(!job.first)job.first=tick+1;if(job.remaining===0)job.done=tick+1;}
  timeline.push({tick,active:running.map(j=>j.id),produced});
  if(mode==='continuous')active=active.filter(id=>jobs.find(j=>j.id===id)!.remaining>0);
  else if(active.every(id=>jobs.find(j=>j.id===id)!.remaining===0))active=[];
  tick++;if(tick>100)throw new Error('Bounded workload failed to terminate');
 }
 return {jobs,timeline,makespan:tick,produced,occupancy:produced/(tick*slots)};
}
// Each cache entry has already occupied its prefix pages; free counts exclude it.
// Reserve a conservative whole-context maximum, not a real incremental allocator.
export function servingPlacement(queueA:number,freeA:number,compatible:boolean,policy:'affinity'|'work'){
 if(!Number.isInteger(queueA)||queueA<0||queueA>256||!Number.isInteger(freeA)||freeA<0||freeA>64)throw new RangeError('Invalid placement inputs');
 const rows=[{id:'A',queue:queueA,free:freeA,hit:compatible?64:0},{id:'B',queue:8,free:48,hit:0}].map(r=>({...r,prefill:96-r.hit,newPages:Math.ceil((192-r.hit)/8),score:r.queue+96-r.hit}));
 const eligible=rows.filter(r=>r.free>=r.newPages);
 eligible.sort((a,b)=>policy==='affinity'?(b.hit-a.hit)||(a.score-b.score):a.score-b.score);
 return {rows:rows.map(r=>({...r,eligible:r.free>=r.newPages})),chosen:eligible[0]!,pageKiB:128,contextPages:24};
}
export type UsageState={phase:'NEW'|'QUEUED'|'RUNNING'|'CANCEL_PENDING'|'TERMINAL';available:number;held:number;spent:number;output:number;terminalSeen:boolean;partial:boolean;result:string;terminalEvents:number};
export type UsageAction='reserve'|'queue-reject'|'start'|'produce'|'disconnect'|'cancel-confirm'|'finish'|'retry'|'duplicate-final';
export function initialUsage():UsageState{return {phase:'NEW',available:1000,held:0,spent:0,output:0,terminalSeen:false,partial:false,result:'READY',terminalEvents:0};}
export function usageAction(input:UsageState,action:UsageAction):UsageState{
 const s={...input};s.result='INVALID_STATE';
 if(action==='reserve'&&s.phase==='NEW'){s.available-=400;s.held=400;s.phase='QUEUED';s.result='RESERVED';}
 if(action==='queue-reject'&&s.phase==='QUEUED'){s.available+=s.held;s.held=0;s.phase='TERMINAL';s.terminalSeen=true;s.terminalEvents=1;s.result='QUEUE_REJECT_REFUNDED';}
 if(action==='start'&&s.phase==='QUEUED'){s.phase='RUNNING';s.result='WORKER_STARTED';}
 if(action==='produce'&&s.phase==='RUNNING'){s.output=40;s.partial=true;s.result='40_TOKENS_PRODUCED';}
 if(action==='disconnect'&&s.phase==='RUNNING'){s.phase='CANCEL_PENDING';s.result='CANCEL_REQUESTED_RESERVATION_HELD';}
 if((action==='finish'&&s.phase==='RUNNING')||(action==='cancel-confirm'&&s.phase==='CANCEL_PENDING')){
  const actual=100+s.output;s.available+=s.held-actual;s.held=0;s.spent=actual;s.phase='TERMINAL';s.terminalSeen=true;s.terminalEvents=1;s.result='FINAL_USAGE_COMMITTED';
 }
 if(action==='duplicate-final'&&s.terminalSeen)s.result='DUPLICATE_FINAL_IGNORED';
 if(action==='retry'&&(s.phase==='RUNNING'||s.phase==='CANCEL_PENDING'))s.result=s.partial?'BLOCK_SILENT_STREAM_RESTART':'RECONCILE_EXISTING_ATTEMPT';
 return s;
}
