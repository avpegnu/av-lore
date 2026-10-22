import test from 'node:test';import assert from 'node:assert/strict';
import {batchOccupancy,servingPlacement,initialUsage,usageAction,type UsageAction} from '../src/lib/serving-models';
test('synthetic batches conserve output work, return short results promptly and reuse iteration slots',()=>{
 for(let slots=1;slots<=4;slots++)for(const mode of ['static','continuous'] as const){const r=batchOccupancy(slots,mode);assert.equal(r.produced,14);assert.ok(r.occupancy<=1);assert.ok(r.jobs.every(j=>j.done>j.arrival&&j.first<=j.done));assert.ok(r.timeline.every(t=>t.active.length<=slots));assert.equal(r.timeline.reduce((n,t)=>n+t.active.length,0),14);}
 const fixed=batchOccupancy(2,'static'),flow=batchOccupancy(2,'continuous');assert.equal(fixed.makespan,10);assert.equal(flow.makespan,7);assert.equal(fixed.jobs.find(j=>j.id==='B')?.done,2);assert.equal(flow.jobs.find(j=>j.id==='C')?.first,3);
 assert.equal(batchOccupancy(1,'static').makespan,batchOccupancy(1,'continuous').makespan);
});
test('prefix affinity is constrained by cache compatibility and hard page headroom, while queue costs can reverse placement',()=>{
 const cache=servingPlacement(200,20,true,'affinity'),load=servingPlacement(200,20,true,'work');assert.equal(cache.chosen.id,'A');assert.equal(load.chosen.id,'B');assert.equal(cache.chosen.newPages,16);assert.equal(cache.chosen.score,232);
 const mismatch=servingPlacement(0,20,false,'affinity');assert.equal(mismatch.rows[0].eligible,false);assert.equal(mismatch.rows[0].hit,0);assert.equal(mismatch.chosen.id,'B');
 assert.equal(servingPlacement(0,8,true,'affinity').chosen.id,'B');
});
test('admission rejection refunds reservations, cancellation holds unknown exposure, and terminal usage effects are idempotent',()=>{
 const reduce=(actions:UsageAction[])=>actions.reduce(usageAction,initialUsage());
 const rejected=reduce(['reserve','queue-reject','duplicate-final']);assert.equal(rejected.available,1000);assert.equal(rejected.held,0);assert.equal(rejected.spent,0);
 const pending=reduce(['reserve','start','produce','disconnect']);assert.equal(pending.held,400);assert.equal(pending.available,600);assert.equal(pending.phase,'CANCEL_PENDING');assert.equal(usageAction(pending,'retry').result,'BLOCK_SILENT_STREAM_RESTART');
 let s=usageAction(pending,'cancel-confirm');assert.equal(s.spent,140);assert.equal(s.available,860);assert.equal(s.terminalEvents,1);s=usageAction(s,'duplicate-final');assert.equal(s.spent,140);assert.equal(s.available,860);
 assert.equal(reduce(['reserve','start','retry']).result,'RECONCILE_EXISTING_ATTEMPT');
 for(const actions of [['reserve','queue-reject'],['reserve','start','produce','disconnect','cancel-confirm','duplicate-final']] as UsageAction[][]){let x=initialUsage();for(const a of actions){const old={...x};x=usageAction(x,a);assert.equal(x.available+x.held+x.spent,1000);assert.ok(x.available>=0&&x.held>=0);assert.notEqual(x,old);}}
});
