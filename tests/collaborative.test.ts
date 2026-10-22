import test from 'node:test';
import assert from 'node:assert/strict';
import {applyTextEdit,rebasePair,pairScenario,mergeTree,renderTree,treeSeed,tombstoneScenario,durableEditScenario,type TextEdit,type TreeOp} from '../src/lib/collaborative-models';
test('bounded concurrent single-edit pairs converge across both delivery orders and preserve targeted deletions',()=>{
 for(const base of ['', 'A','CODE']){
  const edits=(actor:'A'|'B'):TextEdit[]=>[
   ...Array.from({length:base.length+1},(_,at)=>({kind:'insert' as const,at,value:actor==='A'?'X':'Y',actor})),
   ...Array.from({length:base.length},(_,at)=>({kind:'delete' as const,at,actor}))];
  for(const a of edits('A'))for(const b of edits('B'))
   assert.equal(applyTextEdit(applyTextEdit(base,a),rebasePair(b,a)),applyTextEdit(applyTextEdit(base,b),rebasePair(a,b)));
 }
 for(let index=0;index<4;index++)for(const first of [false,true])assert.equal(pairScenario(index,true,4,first).correct,true);
 assert.equal(pairScenario(0,false,4,true).converged,false);
 const doubleDelete=pairScenario(2,false,4,true);assert.equal(doubleDelete.converged,true);assert.equal(doubleDelete.correct,false);assert.equal(doubleDelete.clientA,'CE');
 assert.throws(()=>applyTextEdit('CODE',{kind:'delete',at:4,actor:'A'}));
});
test('valid insertion-tree operation sets tolerate permutations, duplicates and delete-before-insert dependencies',()=>{
 const ops:TreeOp[]=[...treeSeed,{kind:'insert',id:'B:5',origin:'S:2',value:'X'},{kind:'delete',target:'S:2'},{kind:'insert',id:'A:5',origin:'S:2',value:'Y'}];
 const expected=renderTree(mergeTree({nodes:{},deleted:[]},ops));assert.equal(expected.text,'CYXDE');
 // Deterministically permute delivery, including missing origins until the final merge.
 for(let rotation=0;rotation<ops.length;rotation++)for(const reverse of [false,true]){
  const delivery=[...ops.slice(rotation),...ops.slice(0,rotation)];if(reverse)delivery.reverse();
  let s={nodes:{},deleted:[]} as ReturnType<typeof mergeTree>;
  for(const op of delivery)s=mergeTree(s,[op,op]);
  assert.deepEqual(renderTree(s),expected);
 }
 assert.throws(()=>mergeTree(mergeTree({nodes:{},deleted:[]},treeSeed),[{kind:'insert',id:'S:1',origin:null,value:'Z'}]));
});
test('deleting visible content can retain its structural anchor; premature anchor compaction strands offline inserts',()=>{
 const safe=tombstoneScenario(3,true),unsafe=tombstoneScenario(3,false);
 assert.equal(safe.viewA.text,'CXDE');assert.equal(safe.viewA.text,safe.viewB.text);assert.equal(safe.viewA.pending,0);
 assert.equal(unsafe.viewA.text,'CDE');assert.equal(unsafe.viewB.text,'CXDE');assert.equal(unsafe.viewA.pending,1);
 assert.equal(tombstoneScenario(2,false).viewA.text,'CDE');
});
test('durable acceptance, recoverable dedup and writer fencing address independent recovery failures',()=>{
 assert.equal(durableEditScenario(3,true,true,false).acknowledgedLoss,false);
 assert.equal(durableEditScenario(3,false,true,false).acknowledgedLoss,true);
 const replay=durableEditScenario(4,true,true,true);assert.equal(replay.result,'RETAINED_RESULT');assert.equal(replay.revision,1);assert.equal(replay.committed,'CODE!');assert.equal(replay.pending,false);
 assert.equal(durableEditScenario(5,true,true,true).committed,'CODE!');
 assert.equal(durableEditScenario(5,true,false,true).committed,'CODE!?');
 assert.equal(durableEditScenario(3,false,true,true).pending,true);
});
