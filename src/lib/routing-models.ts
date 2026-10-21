export function stableHash(value:string){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b);hash^=hash>>>13;hash=Math.imul(hash,0xc2b2ae35);hash^=hash>>>16;
  return hash>>>0;
}
export type RingToken={hash:number;owner:string;slot:number};
export function buildRing(owners:string[],virtualNodes:number):RingToken[]{
  if(!owners.length||new Set(owners).size!==owners.length||!Number.isInteger(virtualNodes)||virtualNodes<1)throw new RangeError('Unique owners and positive virtual-node count required');
  return owners.flatMap(owner=>Array.from({length:virtualNodes},(_,slot)=>({owner,slot,hash:stableHash(owner+'#'+slot)}))).sort((a,b)=>a.hash-b.hash||a.owner.localeCompare(b.owner)||a.slot-b.slot);
}
export function ringOwner(ring:RingToken[],key:string){
  if(!ring.length)throw new RangeError('Empty ring');
  const hash=stableHash(key);let low=0,high=ring.length;
  while(low<high){const middle=(low+high)>>>1;if(ring[middle].hash<hash)low=middle+1;else high=middle;}
  return ring[low%ring.length];
}
export type BalancerAlgorithm='round-robin'|'least-outstanding'|'two-choices';
export function balanceRequests(algorithm:BalancerAlgorithm,slowNode:boolean){
  const jobs:{id:number;server:number;arrival:number;start:number;finish:number;duration:number}[]=[];
  const available=[0,0,0];
  for(let id=0;id<30;id++){
    const arrival=id*40;
    const outstanding=(server:number)=>jobs.filter(j=>j.server===server&&j.finish>arrival).length;
    let server=id%3;
    if(algorithm==='least-outstanding')server=[0,1,2].sort((a,b)=>outstanding(a)-outstanding(b)||a-b)[0];
    if(algorithm==='two-choices'){
      const a=stableHash('first:'+id)%3,b=(a+1+stableHash('second:'+id)%2)%3;
      server=outstanding(a)<=outstanding(b)?a:b;
    }
    const duration=(id%7===2?800:70)*(slowNode&&server===1?2:1);
    const start=Math.max(arrival,available[server]),finish=start+duration;
    available[server]=finish;jobs.push({id,server,arrival,start,finish,duration});
  }
  const latencies=jobs.map(j=>j.finish-j.arrival).sort((a,b)=>a-b);
  return {jobs,mean:latencies.reduce((a,b)=>a+b,0)/latencies.length,p95:latencies[Math.ceil(.95*latencies.length)-1],makespan:Math.max(...available)};
}
