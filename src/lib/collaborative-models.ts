// Bounded teaching models. Pairwise OT is not a full editor/session protocol.
export type TextEdit =
  | {kind:'insert';at:number;value:string;actor:'A'|'B'}
  | {kind:'delete';at:number;actor:'A'|'B'}
  | {kind:'noop';actor:'A'|'B'};
export function applyTextEdit(text:string,op:TextEdit):string {
  if(op.kind==='noop')return text;
  const chars=Array.from(text);
  if(!Number.isSafeInteger(op.at)||op.at<0||op.at>chars.length||(op.kind==='delete'&&op.at===chars.length))throw new RangeError('Edit outside its document context');
  if(op.kind==='insert'){
    if(Array.from(op.value).length!==1)throw new RangeError('One code point required');
    chars.splice(op.at,0,op.value);
  }else chars.splice(op.at,1);
  return chars.join('');
}
// Both input operations must have the SAME base context; actors differ.
export function rebasePair(op:TextEdit,prior:TextEdit):TextEdit {
  if(op.kind==='noop'||prior.kind==='noop')return {...op};
  if(op.kind==='delete'&&prior.kind==='delete'&&op.at===prior.at)return {kind:'noop',actor:op.actor};
  let shift=0;
  if(prior.kind==='insert'){
    if(op.at>prior.at||(op.at===prior.at&&(op.kind==='delete'||op.actor>prior.actor)))shift=1;
  }else if(op.at>prior.at)shift=-1;
  return {...op,at:op.at+shift};
}
export const editPairs:{a:TextEdit;b:TextEdit}[]=[
  {a:{kind:'insert',at:1,value:'X',actor:'A'},b:{kind:'delete',at:1,actor:'B'}},
  {a:{kind:'insert',at:1,value:'X',actor:'A'},b:{kind:'insert',at:1,value:'Y',actor:'B'}},
  {a:{kind:'delete',at:1,actor:'A'},b:{kind:'delete',at:1,actor:'B'}},
  {a:{kind:'delete',at:1,actor:'A'},b:{kind:'delete',at:2,actor:'B'}},
];
export function pairScenario(index:number,transform:boolean,stage:number,aFirst:boolean){
  if(!Number.isInteger(index)||!editPairs[index]||!Number.isInteger(stage)||stage<0||stage>4)throw new RangeError('Invalid bounded pair scenario');
  const base='CODE',{a,b}=editPairs[index],localA=applyTextEdit(base,a),localB=applyTextEdit(base,b),
    afterA=transform?rebasePair(b,a):b, afterB=transform?rebasePair(a,b):a,
    resultA=applyTextEdit(localA,afterA),resultB=applyTextEdit(localB,afterB),
    server=stage<2?base:stage===2?(aFirst?localA:localB):(aFirst?resultA:resultB);
  return {base,a,b,afterA,afterB,server,clientA:stage===0?base:stage<4?localA:resultA,
    clientB:stage===0?base:stage<4?localB:resultB,resultA,resultB,
    converged:stage===4&&resultA===resultB,
    correct:stage===4&&resultA===pairScenarioExpected(index)&&resultB===pairScenarioExpected(index)};
}
const expected=['CXDE','CXYODE','CDE','CE'];
export const pairScenarioExpected=(index:number)=>expected[index];
export const describeEdit=(op:TextEdit)=>op.kind==='noop'?'NOOP':op.kind==='insert'?`INSERT ${op.value} @${op.at}`:`DELETE @${op.at}`;
export type TreeInsert={kind:'insert';id:string;origin:string|null;value:string};
export type TreeOp=TreeInsert|{kind:'delete';target:string};
export type TreeState={nodes:Record<string,TreeInsert>;deleted:string[]};
const validId=(id:string)=>/^[SAB]:[1-9][0-9]?$/.test(id);
export function mergeTree(input:TreeState,ops:TreeOp[]):TreeState {
  const next=structuredClone(input),deleted=new Set(next.deleted);
  for(const op of ops){
    if(op.kind==='delete'){
      if(!validId(op.target))throw new RangeError('Invalid target');
      deleted.add(op.target);
    }else{
      if(!validId(op.id)||(op.origin!==null&&!validId(op.origin))||op.origin===op.id||Array.from(op.value).length!==1)throw new RangeError('Invalid insertion identity or origin');
      const prior=next.nodes[op.id];
      if(prior&&(prior.origin!==op.origin||prior.value!==op.value))throw new RangeError('Immutable identity conflict');
      next.nodes[op.id]={...op};
    }
  }
  next.deleted=[...deleted].sort();return next;
}
export function renderTree(state:TreeState){
  const rows:(TreeInsert&{depth:number;deleted:boolean})[]=[],visited=new Set<string>();
  const visit=(origin:string|null,depth:number)=>{
    Object.values(state.nodes).filter(n=>n.origin===origin)
      .sort((a,b)=>Number(b.id.split(':')[1])-Number(a.id.split(':')[1])||(a.id<b.id?-1:a.id>b.id?1:0))
      .forEach(n=>{if(visited.has(n.id))return;visited.add(n.id);rows.push({...n,depth,deleted:state.deleted.includes(n.id)});visit(n.id,depth+1);});
  };
  visit(null,0);
  return {text:rows.filter(n=>!n.deleted).map(n=>n.value).join(''),rows,pending:Object.keys(state.nodes).length-visited.size};
}
export const treeSeed:TreeOp[]=Array.from('CODE',(value,i)=>({kind:'insert',id:`S:${i+1}`,origin:i?`S:${i}`:null,value}));
const offlineInsert:TreeInsert={kind:'insert',id:'B:5',origin:'S:2',value:'X'};
export function tombstoneScenario(stage:number,keepAnchor:boolean){
  if(!Number.isInteger(stage)||stage<0||stage>3)throw new RangeError('Invalid anchor scenario');
  let a=mergeTree({nodes:{},deleted:[]},treeSeed),b=structuredClone(a);
  if(stage>=1){a=mergeTree(a,[{kind:'delete',target:'S:2'}]);b=mergeTree(b,[offlineInsert]);}
  if(stage>=2&&!keepAnchor){
    // Deliberately unsafe: preserve visible children but discard the deleted origin.
    delete a.nodes['S:2'];a.nodes['S:3']={...a.nodes['S:3'],origin:'S:1'};
  }
  if(stage>=3){a=mergeTree(a,[offlineInsert]);b=mergeTree(b,[{kind:'delete',target:'S:2'}]);}
  return {a,b,viewA:renderTree(a),viewB:renderTree(b),anchorRetained:!!a.nodes['S:2']};
}
export function durableEditScenario(stage:number,durable:boolean,fence:boolean,replyLost:boolean){
  if(!Number.isInteger(stage)||stage<0||stage>5)throw new RangeError('Invalid commit timeline');
  let committed='CODE',revision=0,seen=false,result='LOCAL_PENDING';
  if(stage>=1)result='APPLIED_RAM';
  if(stage>=2){if(durable){committed+='!';revision=1;seen=true;}result=replyLost?'REPLY_LOST':'ACK_RECEIVED';}
  if(stage>=3)result='RESTORED_FROM_COMMITTED_LOG';
  if(stage>=4){if(seen)result='RETAINED_RESULT';else{committed+='!';revision++;seen=true;result='RETRY_COMMITTED';}}
  if(stage>=5){if(fence)result='REJECT_OLD_EPOCH';else{committed+='?';revision++;result='OLD_EPOCH_WRITE_ACCEPTED';}}
  return {committed,revision,ownerEpoch:stage>=3?5:4,result,
    applied:stage===1||stage===2?'CODE!':committed,
    pending:stage<2||stage<4&&replyLost,
    acknowledgedLoss:stage>=3&&!durable&&!replyLost,
    seen};
}

// Fixed two-client schedule: two local inserts, one remote insert, delayed ACKs.
// A single outstanding operation is sent at a time; no network/storage benchmark.
export function bufferedEditScenario(stage:number,rebaseBuffer:boolean){
  if(!Number.isInteger(stage)||stage<0||stage>6)throw new RangeError('Invalid client-buffer timeline');
  const first:TextEdit={kind:'insert',at:1,value:'X',actor:'A'},
    second:TextEdit={kind:'insert',at:2,value:'Y',actor:'A'},
    remote:TextEdit={kind:'insert',at:0,value:'Z',actor:'B'};
  let local='CODE',server='CODE',serverRevision=0,confirmedRevision=0;
  let outstanding:TextEdit|null=null,buffer:TextEdit|null=null,identity='—',sentBase:number|null=null;
  if(stage>=1){local=applyTextEdit(local,first);outstanding=first;identity='A/1';sentBase=0;}
  if(stage>=2){local=applyTextEdit(local,second);buffer=second;}
  if(stage>=3){
    server=applyTextEdit(server,remote);serverRevision=confirmedRevision=1;
    // Both operations used to transform each other share the same context.
    const throughFirst=rebasePair(remote,first);
    outstanding=rebasePair(first,remote);
    if(rebaseBuffer)buffer=rebasePair(second,throughFirst);
    const throughBuffer=rebasePair(throughFirst,second);
    local=applyTextEdit(local,throughBuffer);
  }
  if(stage>=4){server=applyTextEdit(server,rebasePair(first,remote));serverRevision=2;}
  if(stage>=5){
    confirmedRevision=2;outstanding=buffer;buffer=null;identity='A/2';sentBase=2;
  }
  if(stage>=6){
    server=applyTextEdit(server,outstanding!);serverRevision=confirmedRevision=3;
    outstanding=null;identity='—';sentBase=null;
  }
  return {local,server,serverRevision,confirmedRevision,outstanding,buffer,identity,sentBase,
    pending:Number(!!outstanding)+Number(!!buffer),agree:local===server};
}
