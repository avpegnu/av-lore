import test from 'node:test';import assert from 'node:assert/strict';
import {onCallSchedule,lsmReplay,lsmLookup,lsmOperations,shardDistribution} from '../src/lib/database-models';
test('write skew violates a cross-row predicate while modeled serializable retry preserves it',()=>{
 const snapshot=onCallSchedule(false),serial=onCallSchedule(true);
 assert.equal(Number(snapshot.alice)+Number(snapshot.bob),0);
 assert.equal(Number(serial.alice)+Number(serial.bob),1);
 assert.equal(serial.aborts,1);
});
test('LSM reads latest values and tombstones before/after compaction at every replay point',()=>{
 for(let steps=0;steps<=lsmOperations.length;steps++){
  const expected=new Map<string,string|null>(lsmOperations.slice(0,steps).map(([key,value])=>[key,value]));
  for(const compact of [false,true])for(const key of ['A','B','C','D','E','F','missing']){
   const result=lsmLookup(lsmReplay(steps,compact),key);
   assert.equal(result.value,expected.get(key)??null);
   assert.equal(result.deleted,expected.has(key)&&expected.get(key)===null);
  }
 }
 const before=lsmLookup(lsmReplay(9,false),'missing'),after=lsmLookup(lsmReplay(9,true),'missing');
 assert.ok(after.visited.length<before.visited.length);
});
test('sharding conserves keys and traffic but cannot spread one hot key across owners',()=>{
 for(const strategy of ['hash','range'] as const)for(const pattern of ['uniform','latest','hot-key'] as const)for(const n of [2,4,8]){
  const shards=shardDistribution(strategy,pattern,n);
  assert.equal(shards.reduce((sum,s)=>sum+s.keys,0),1000);
  assert.ok(Math.abs(shards.reduce((sum,s)=>sum+s.traffic,0)-1)<1e-9);
  if(pattern==='hot-key')assert.ok(Math.max(...shards.map(s=>s.traffic))>=.9);
 }
 assert.ok(Math.max(...shardDistribution('hash','latest',4).map(s=>s.traffic))<Math.max(...shardDistribution('range','latest',4).map(s=>s.traffic)));
});
