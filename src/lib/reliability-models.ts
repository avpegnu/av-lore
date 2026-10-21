import {stableHash} from './routing-models';
export function dependencyAvailability(p:number,count:number,replicas:number,commonFailure:number){
 if(p<0||p>1||!Number.isInteger(count)||count<1||!Number.isInteger(replicas)||replicas<1||commonFailure<0||commonFailure>1)throw new RangeError('Invalid availability assumptions');
 return {series:p**count,redundant:(1-commonFailure)*(1-(1-p)**replicas)};
}
export function retryAmplification(layers:number,attempts:number){
 if(!Number.isInteger(layers)||layers<1||!Number.isInteger(attempts)||attempts<1)throw new RangeError('Positive retry dimensions required');return attempts**layers;
}
export function retrySchedule(jitter:boolean,budgetRatio:number){
 if(budgetRatio<0||!Number.isFinite(budgetRatio))throw new RangeError('Finite retry budget required');
 const initial=24,budget=Math.floor(initial*budgetRatio),pending=Array.from({length:initial},(_,user)=>({user,attempt:0,at:0})),events:typeof pending=[];
 let retries=0;
 while(pending.length){pending.sort((a,b)=>a.at-b.at||a.user-b.user);const event=pending.shift()!;
  if(event.attempt>0){if(retries>=budget)continue;retries++;}events.push(event);
  if(event.attempt<2){const ceiling=100*2**event.attempt;const delay=jitter?stableHash(event.user+':'+event.attempt)%(ceiling+1):ceiling;pending.push({user:event.user,attempt:event.attempt+1,at:event.at+delay});}
 }
 const buckets=Array.from({length:8},(_,i)=>({at:i*50,retries:events.filter(e=>e.attempt>0&&Math.floor(e.at/50)===i).length}));
 return {events,buckets,retries,peakRetries:Math.max(...buckets.map(b=>b.retries))};
}
export type BreakerEvent='success'|'failure'|'wait'|'probe';
export function breakerReplay(events:readonly BreakerEvent[],threshold:number){
 if(!Number.isInteger(threshold)||threshold<1)throw new RangeError('Positive failure threshold required');
 let state:'closed'|'open'|'half-open'='closed',now=0,until=0,failures=0,calls=0,blocked=0;
 for(const event of events){
  if(event==='wait'){now+=5;continue;}
  if(event==='probe'){if(state==='open'&&now>=until)state='half-open';else blocked++;continue;}
  now++;
  if(state==='open'){blocked++;continue;}
  calls++;
  if(event==='success'){state='closed';failures=0;}
  else{failures++;if(state==='half-open'||failures>=threshold){state='open';until=now+5;}}
 }
 return {state,now,until,failures,calls,blocked,canProbe:state==='open'&&now>=until};
}
