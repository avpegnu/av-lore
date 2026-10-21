import test from 'node:test';import assert from 'node:assert/strict';
import {cacheTrace,evictionReplay,cacheBurst} from '../src/lib/cache-models';
test('eviction policies obey capacity, account for every request and differ in hit recency semantics',()=>{
 for(const p of ['lru','lfu','fifo'] as const)for(let step=0;step<=cacheTrace.length;step++){
  const state=evictionReplay(p,step);assert.ok(state.entries.length<=3);assert.equal(state.hits+state.misses,step);
  assert.equal(new Set(state.entries.map(e=>e.key)).size,state.entries.length);
 }
 assert.equal(evictionReplay('fifo',7).events.at(-1)?.evicted,'A');
 assert.equal(evictionReplay('lru',7).events.at(-1)?.evicted,'C');
 assert.equal(evictionReplay('lfu',7).events.at(-1)?.evicted,'C');
 assert.throws(()=>evictionReplay('lru',-1));
});
test('coalescing reduces same-key origin load while TTL jitter only spreads expiry across keys',()=>{
 assert.equal(cacheBurst(100,10,false,false,60).originLoads,1000);
 assert.equal(cacheBurst(100,10,true,false,60).originLoads,100);
 assert.equal(cacheBurst(100,10,false,false,59).originLoads,0);
 const spread=cacheBurst(100,10,false,true,60);assert.ok(spread.expired>0&&spread.expired<100);
 assert.equal(cacheBurst(100,10,false,true,80).originLoads,1000);
 assert.equal(cacheBurst(100,10,true,true,80).originLoads,100);
});
