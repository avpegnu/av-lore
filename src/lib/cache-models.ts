import {stableHash} from './routing-models';
export type EvictionPolicy='lru'|'lfu'|'fifo';
export const cacheTrace=['A','B','A','C','A','B','D','C','E','A','B','D','A','F','B','A'];
export function evictionReplay(policy:EvictionPolicy,steps:number,capacity=3){
  if(!Number.isInteger(steps)||steps<0||steps>cacheTrace.length||!Number.isInteger(capacity)||capacity<1)throw new RangeError('Invalid replay bounds');
  const entries=new Map<string,{key:string;inserted:number;last:number;frequency:number}>();
  const events:{key:string;hit:boolean;evicted:string|null}[]=[];
  for(let tick=0;tick<steps;tick++){
    const key=cacheTrace[tick],entry=entries.get(key);let evicted:string|null=null;
    if(entry){entry.last=tick;entry.frequency++;}
    else{
      if(entries.size>=capacity){
        const candidates=[...entries.values()].sort((a,b)=>policy==='fifo'?a.inserted-b.inserted:policy==='lru'?a.last-b.last:a.frequency-b.frequency||a.last-b.last);
        evicted=candidates[0].key;entries.delete(evicted);
      }
      entries.set(key,{key,inserted:tick,last:tick,frequency:1});
    }
    events.push({key,hit:!!entry,evicted});
  }
  return {entries:[...entries.values()],events,hits:events.filter(e=>e.hit).length,misses:events.filter(e=>!e.hit).length};
}
export function cacheBurst(keys:number,readersPerKey:number,coalesce:boolean,jitter:boolean,now:number){
  if(![keys,readersPerKey,now].every(Number.isFinite)||keys<1||readersPerKey<1||now<0)throw new RangeError('Invalid burst inputs');
  const expiration=Array.from({length:keys},(_,i)=>60+(jitter?stableHash('ttl:'+i)%31-15:0));
  const expired=expiration.filter(t=>t<=now).length;
  return {expiration,expired,originLoads:expired*(coalesce?1:readersPerKey),requests:keys*readersPerKey};
}
