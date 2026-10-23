import {test} from 'node:test';import assert from 'node:assert/strict';
import {assignPartitions,nextContiguousOffset,deliveryCrash} from '../src/lib/messaging-models';
import {rateReplay,rateStreams,counterRace} from '../src/lib/rate-limit-models';
import {snowflakeLayout,packId,unpackId,leafReplay} from '../src/lib/identifier-models';
import {dependencyAvailability,retrySchedule,retryAmplification,breakerReplay} from '../src/lib/reliability-models';
test('classic assignment gives each partition exactly one owner and offset commits cannot skip holes',()=>{
 for(let p=1;p<=8;p++)for(let c=1;c<=10;c++){const groups=assignPartitions(p,c);assert.deepEqual(groups.flatMap(g=>g.partitions).sort((a,b)=>a-b),Array.from({length:p},(_,i)=>i));assert.equal(groups.filter(g=>g.partitions.length).length,Math.min(p,c));}
 assert.equal(nextContiguousOffset([1,2,7]),0);assert.equal(nextContiguousOffset([0,1,2,7]),3);assert.equal(nextContiguousOffset([3,4],3),5);
 assert.equal(deliveryCrash('ack-first','before-effect').missing,true);assert.equal(deliveryCrash('effect-first','after-effect').duplicate,true);for(const crash of ['before-effect','after-effect'] as const)assert.equal(deliveryCrash('transactional-dedup',crash).effects,1);
});
test('rolling log bounds every admitted window while fixed windows admit a boundary burst; atomic spending bounds races',()=>{
 const fixed=rateReplay('fixed',rateStreams.boundary,6),log=rateReplay('log',rateStreams.boundary,6);assert.equal(fixed.allowed,12);assert.equal(log.allowed,6);assert.equal(fixed.peakWindow,12);
 for(const stream of Object.values(rateStreams))for(let limit=2;limit<=12;limit++){
  assert.ok(rateReplay('log',stream,limit).peakWindow<=limit);
  for(const algorithm of ['token','leaky','fixed','log','counter'] as const){const x=rateReplay(algorithm,stream,limit,6);assert.equal(x.allowed+x.rejected,stream.length);assert.ok(x.events.every(e=>e.releaseAt>=e.at));}
 }
 const leaky=rateReplay('leaky',rateStreams.boundary,6,6).events.filter(e=>e.accepted);for(let i=1;i<leaky.length;i++)assert.ok(leaky[i].releaseAt-leaky[i-1].releaseAt>=1000/6-1e-7);
 assert.equal(counterRace(8,false).allowed,8);assert.equal(counterRace(8,true).allowed,1);
});
test('limiter time scaling preserves decisions, queue spacing and rolling-window boundaries',()=>{
 const times=[0,0,1,999,1000,1000,1001,2100,9000];
 for(const algorithm of ['token','leaky','fixed','log','counter'] as const){
  const original=rateReplay(algorithm,times,3,4,1000);
  for(const scale of [1.5,3,5]){
   const scaled=rateReplay(algorithm,times.map(t=>t*scale),3,4,1000*scale);
   assert.deepEqual(scaled.events.map(e=>e.accepted),original.events.map(e=>e.accepted));
   assert.equal(scaled.peakWindow,original.peakWindow);
   scaled.events.forEach((event,i)=>assert.ok(Math.abs(event.releaseAt-original.events[i].releaseAt*scale)<1e-7));
  }
 }
 assert.equal(rateReplay('log',[0,999,1000],1,1,1000).allowed,2);
 const queue=rateReplay('leaky',[0,0,0],2,2,4000);
 assert.deepEqual(queue.events.map(e=>e.accepted),[true,true,false]);
 assert.deepEqual(queue.events.filter(e=>e.accepted).map(e=>e.releaseAt),[2000,4000]);
 for(const window of [0,-1,Infinity,NaN])assert.throws(()=>rateReplay('token',times,3,3,window),RangeError);
});
test('63-bit IDs round trip without Number coercion and leaf replays conserve sorted unique keys',()=>{
 const l=snowflakeLayout(10,12);assert.equal(l.timeBits,41);assert.equal(l.perMillisecond,4096);assert.equal(l.workers,1024);
 for(const [w,s] of [[4,4],[10,12],[14,18]]){const id=packId(100000000n,7n,3n,w,s);assert.deepEqual(unpackId(id,w,s),{time:100000000n,worker:7n,sequence:3n});assert.ok(id<1n<<63n);}
 assert.throws(()=>packId(0n,1024n,0n,10,12),RangeError);assert.throws(()=>packId(0n,0n,4096n,10,12),RangeError);
 for(const mode of ['random','time'] as const)for(let n=0;n<=31;n++){const result=leafReplay(mode,n),keys=result.pages.flatMap(p=>p.keys);assert.equal(keys.length,n);assert.equal(new Set(keys).size,n);assert.deepEqual(keys,[...result.order].sort((a,b)=>a-b));assert.ok(result.pages.every(p=>p.keys.length<=4));}
});
test('availability distinguishes independence from common causes; jitter preserves work and budgets bound retries',()=>{
 const independent=dependencyAvailability(.999,5,3,0),shared=dependencyAvailability(.999,5,3,.01);assert.ok(Math.abs(independent.series-.999**5)<1e-12);assert.ok(shared.redundant<=.99);assert.ok(independent.redundant>shared.redundant);
 assert.equal(retryAmplification(5,3),243);assert.equal(retrySchedule(false,2).retries,48);assert.equal(retrySchedule(true,2).retries,48);assert.equal(retrySchedule(true,.5).retries,12);assert.equal(retrySchedule(false,0).retries,0);
});
test('breaker rejects while open, admits a single explicit probe after cooldown and reopens on probe failure',()=>{
 const opening=['failure','failure','failure'] as const;assert.equal(breakerReplay(opening,3).state,'open');const blocked=breakerReplay([...opening,'success'],3);assert.equal(blocked.calls,3);assert.equal(blocked.blocked,1);
 assert.equal(breakerReplay([...opening,'wait','probe'],3).state,'half-open');assert.equal(breakerReplay([...opening,'wait','probe','failure'],3).state,'open');assert.equal(breakerReplay([...opening,'wait','probe','success'],3).state,'closed');
});
