export function assignPartitions(partitions:number,consumers:number){
 if(!Number.isInteger(partitions)||!Number.isInteger(consumers)||partitions<1||consumers<1)throw new RangeError('Positive group dimensions required');
 return Array.from({length:consumers},(_,consumer)=>({consumer,partitions:Array.from({length:partitions},(_,p)=>p).filter(p=>p%consumers===consumer)}));
}
export function nextContiguousOffset(completed:readonly number[],start=0){
 const done=new Set(completed);let next=start;while(done.has(next))next++;return next;
}
export type DeliveryMode='ack-first'|'effect-first'|'transactional-dedup';
export function deliveryCrash(mode:DeliveryMode,crash:'before-effect'|'after-effect'){
 // One logical event. The second delivery, if required, runs to completion.
 const ackFirst=mode==='ack-first',firstEffects=crash==='after-effect'?1:0;
 const redelivered=!ackFirst,effects=firstEffects+(redelivered&&!(mode==='transactional-dedup'&&firstEffects)?1:0);
 return {deliveries:redelivered?2:1,effects,redelivered,missing:effects===0,duplicate:effects>1};
}
