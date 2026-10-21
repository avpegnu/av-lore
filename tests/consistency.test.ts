import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessionRead,quorumBounds,raftFrame} from '../src/lib/consistency-models';
test('session watermark never returns a version below the completed write; replica reads expose distinct anomalies',()=>{
 for(let v=0;v<=3;v++){
  const result=sessionRead(v,'watermark');assert.equal(result.waiting,v<3);if(!result.waiting)assert.equal(result.observed,3);
  assert.equal(sessionRead(v,'primary').observed,3);
 }
 assert.equal(sessionRead(2,'replica').monotonic,true);assert.equal(sessionRead(2,'replica').readYourWrites,false);assert.equal(sessionRead(1,'replica').monotonic,false);
});
test('fixed membership quorum lower bound matches exhaustive read/write set intersections',()=>{
 const subsets=(n:number,size:number)=>Array.from({length:1<<n},(_,bits)=>Array.from({length:n},(_,i)=>i).filter(i=>bits&(1<<i))).filter(s=>s.length===size);
 for(let n=3;n<=6;n++)for(let r=1;r<=n;r++)for(let w=1;w<=n;w++){
  const minimum=Math.min(...subsets(n,r).flatMap(a=>subsets(n,w).map(b=>a.filter(x=>b.includes(x)).length)));
  const result=quorumBounds(n,r,w);assert.equal(result.minimumOverlap,minimum);assert.equal(result.intersection.length,minimum);
  for(let f=0;f<=n;f++){const q=quorumBounds(n,r,w,f);assert.equal(q.readAvailable,n-f>=r);assert.equal(q.writeAvailable,n-f>=w);}
 }
});
test('partitioned old leader cannot commit its divergent entry and healing preserves committed prefix',()=>{
 for(let f=0;f<=4;f++){
  const nodes=raftFrame(f);for(const n of nodes)assert.ok(n.commitIndex>=1);
  for(const n of nodes.filter(n=>n.lastEntry.includes(':x:')))assert.equal(n.commitIndex,1);
  const committedAt2=new Set(nodes.filter(n=>n.commitIndex===2).map(n=>n.lastEntry));assert.ok(committedAt2.size<=1);
  const leaders=nodes.filter(n=>n.role==='leader');assert.equal(new Set(leaders.map(n=>n.term)).size,leaders.length);
 }
 assert.equal(raftFrame(4).filter(n=>n.role==='leader').map(n=>n.id).join(''),'C');
});
