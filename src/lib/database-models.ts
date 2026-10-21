import {stableHash} from './routing-models';
export function onCallSchedule(serializable:boolean){
  // Two transactions read the same initial predicate and update different rows.
  return serializable
    ? {alice:false,bob:true,aborts:1,events:['readA2','readB2','commitA','abortB','retryB1']}
    : {alice:false,bob:false,aborts:0,events:['readA2','readB2','commitA','commitB','violated']};
}
type RecordValue={key:string;value:string|null;sequence:number};
export const lsmOperations=[['A','a1'],['B','b1'],['C','c1'],['A','a2'],['D','d1'],['B','b2'],['C',null],['E','e1'],['F','f1']] as const;
export function lsmReplay(steps:number,compact:boolean){
  if(!Number.isInteger(steps)||steps<0||steps>lsmOperations.length)throw new RangeError('Invalid LSM replay step');
  const memory=new Map<string,RecordValue>();let files:RecordValue[][]=[];
  for(let i=0;i<steps;i++){
    const [key,value]=lsmOperations[i];memory.set(key,{key,value,sequence:i+1});
    if(memory.size>=3){files.unshift([...memory.values()].sort((a,b)=>a.key.localeCompare(b.key)));memory.clear();}
  }
  if(compact&&files.length>1){
    const newest=new Map<string,RecordValue>();
    for(const file of files)for(const row of file)if(!newest.has(row.key))newest.set(row.key,row);
    // Keep tombstones; this toy does not model snapshot-aware tombstone garbage collection.
    files=[[...newest.values()].sort((a,b)=>a.key.localeCompare(b.key))];
  }
  return {memory:[...memory.values()].sort((a,b)=>a.key.localeCompare(b.key)),files};
}
export function lsmLookup(state:ReturnType<typeof lsmReplay>,key:string){
  const stores=[state.memory,...state.files],visited:string[]=[];
  for(let i=0;i<stores.length;i++){
    const name=i===0?'Memtable':'SST-'+i;visited.push(name);
    const row=stores[i].find(r=>r.key===key);
    if(row)return {value:row.value,deleted:row.value===null,visited};
  }
  return {value:null,deleted:false,visited};
}
export function shardDistribution(strategy:'hash'|'range',pattern:'uniform'|'latest'|'hot-key',shards:number){
  if(!Number.isInteger(shards)||shards<1)throw new RangeError('Positive shard count required');
  const buckets=Array.from({length:shards},(_,id)=>({id,keys:0,traffic:0}));
  for(let key=0;key<1000;key++){
    const owner=strategy==='hash'?stableHash('user:'+key)%shards:Math.min(shards-1,Math.floor(key/1000*shards));
    const weight=pattern==='uniform'?1/1000:pattern==='hot-key'?(key===999?.9:.1/999):(key>=900?.9/100:.1/900);
    buckets[owner].keys++;buckets[owner].traffic+=weight;
  }
  return buckets;
}
