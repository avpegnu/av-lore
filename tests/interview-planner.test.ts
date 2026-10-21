import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planTimeline,phaseAt,formatClock} from '../src/lib/interview-planner';
test('planner preserves minute budgets and distinguishes buffer, phase boundaries and overflow',()=>{
 const t=planTimeline([7,12,18,5],45);assert.equal(t.buffer,180);assert.equal(t.allocated,2520);
 assert.equal(phaseAt(419,t),0);assert.equal(phaseAt(420,t),1);assert.equal(phaseAt(1140,t),2);assert.equal(phaseAt(2220,t),3);assert.equal(phaseAt(2520,t),-1);
 assert.equal(planTimeline([30,12,18,5],45).buffer,-1200);
 assert.equal(formatClock(65),'01:05');assert.equal(formatClock(2700),'45:00');
 assert.throws(()=>planTimeline([0,10],45),RangeError);
});
