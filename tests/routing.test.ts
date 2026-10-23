import test from 'node:test';import assert from 'node:assert/strict';
import {buildRing,ringOwner,balanceRequests} from '../src/lib/routing-models';
test('adding a ring owner moves keys only to that owner and removal moves only its previous keys',()=>{
 const a=buildRing(['A','B','C'],64),b=buildRing(['A','B','C','D'],64),c=buildRing(['A','B'],64);
 for(let i=0;i<10000;i++){
  const key='user:'+i,old=ringOwner(a,key).owner,added=ringOwner(b,key).owner,removed=ringOwner(c,key).owner;
  if(old!==added)assert.equal(added,'D');
  if(old!==removed)assert.equal(old,'C');
 }
 assert.throws(()=>buildRing([],32));assert.throws(()=>buildRing(['A','A'],32));
});
test('balancers preserve requests and model serial service without overlapping jobs on one node',()=>{
 for(const algo of ['round-robin','random','least-outstanding','two-choices'] as const)for(const slow of [false,true]){
  const {jobs,mean,p95}=balanceRequests(algo,slow);assert.equal(jobs.length,30);assert.ok(mean>0&&p95>=mean);
  for(const server of [0,1,2]){const own=jobs.filter(j=>j.server===server);for(let i=0;i<own.length;i++){const j=own[i];assert.ok(j.start>=j.arrival);assert.equal(j.finish-j.start,j.duration);if(i)assert.ok(j.start>=own[i-1].finish);}}
 }
});

test('seeded random replays the same workload without pretending round-robin assignment',()=>{
 const first=balanceRequests('random',false),again=balanceRequests('random',false),rr=balanceRequests('round-robin',false);
 assert.deepEqual(first,again);
 assert.notDeepEqual(first.jobs.map(j=>j.server),rr.jobs.map(j=>j.server));
 assert.deepEqual(first.jobs.map(j=>[j.id,j.arrival,j.duration]),rr.jobs.map(j=>[j.id,j.arrival,j.duration]));
});
