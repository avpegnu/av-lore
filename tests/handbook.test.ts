import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handbookSchema } from '../src/lib/handbook-schema';
import { feedCapacity, kvCapacity } from '../src/lib/handbook-models';

test('fan-out worksheet scales recipient work without pretending source posts or bounded timelines grow', () => {
  const input = { users:30e6,postsPerUser:0.5,readsPerUser:10,followers:200,cachedIds:500,bytesPerId:16,peak:3,pushFraction:1 };
  const base = feedCapacity(input), larger = feedCapacity({...input,followers:800});
  assert.equal(base.cacheGB,240);
  assert.ok(Math.abs(base.fanout - 34722.2222)<0.001);
  assert.equal(larger.fanout,base.fanout*4);
  assert.equal(larger.writes,base.writes);
  assert.equal(larger.cacheGB,base.cacheGB);
  assert.equal(feedCapacity({...input,pushFraction:0}).fanout,0);
  assert.throws(()=>feedCapacity({...input,pushFraction:1.1}));
});
test('KV worksheet counts K and V, uses KV heads, and keeps decimal GB distinct from GiB', () => {
  const input={layers:32,kvHeads:8,headDimension:128,bytes:2,tokens:8192,sequences:16,memoryGB:40};
  const result=kvCapacity(input);
  assert.equal(result.bytesPerToken,131072);
  assert.equal(result.perSequenceGB,2**30/1e9);
  assert.equal(result.totalGB,16*2**30/1e9);
  assert.equal(kvCapacity({...input,tokens:32768}).totalGB,result.totalGB*4);
  assert.equal(kvCapacity({...input,sequences:0}).totalGB,0);
  assert.throws(()=>kvCapacity({...input,tokens:NaN}));
});
test('authored lessons have paired locales, valid graph endpoints and distinct section IDs',()=>{
  const lessons=fs.readdirSync('src/content/handbook').filter(f=>f.endsWith('.json')).map(f=>handbookSchema.parse(JSON.parse(fs.readFileSync('src/content/handbook/'+f,'utf8'))));
  assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length);
  const catalog=JSON.parse(fs.readFileSync('src/lib/handbook-catalog.json','utf8'));
  for(const lesson of lessons){
    assert.ok(catalog.some((l:{id:string;group:string})=>l.id===lesson.id&&l.group===lesson.group));
    for(const prerequisite of lesson.prerequisites)assert.ok(catalog.some((l:{id:string})=>l.id===prerequisite),lesson.id+' prerequisite '+prerequisite);
    for(const topic of lesson.relatedTopics)assert.ok(fs.existsSync('src/content/topics/'+topic+'.json'),lesson.id+' topic '+topic);
    assert.equal(new Set(lesson.sections.map(s=>s.id)).size,lesson.sections.length,lesson.id);
    for(const section of lesson.sections){
      if(section.table)for(const row of section.table.rows)assert.equal(row.length,section.table.headers.length,lesson.id+'/'+section.id);
      const graphs=[section.diagram,...(section.stages||[]).map(stage=>stage.diagram)].filter((g):g is NonNullable<typeof g>=>!!g);
      for(const graph of graphs){
      const ids=new Set(graph.nodes.map(n=>n.id));
      assert.equal(ids.size,graph.nodes.length);
      assert.equal(new Set(graph.traces.map(t=>t.id)).size,graph.traces.length);
      for(const n of graph.nodes){assert.ok(n.x>=88&&n.x<=graph.width-88);assert.ok(n.y>=32&&n.y<=graph.height-32);}
      for(const trace of graph.traces)for(const edge of trace.steps){assert.ok(ids.has(edge.from));assert.ok(ids.has(edge.to));assert.notEqual(edge.from,edge.to);}
      }
    }
  }
});

test('architecture routes avoid intermediate components in long reverse, vertical and diagonal traces',async()=>{
  const {architectureRoute}=await import('../src/lib/architecture-routing');
  const lessons=fs.readdirSync('src/content/handbook').filter(f=>f.endsWith('.json')).map(f=>handbookSchema.parse(JSON.parse(fs.readFileSync('src/content/handbook/'+f,'utf8'))));
  for(const l of lessons)for(const s of l.sections){
    const graphs=[s.diagram,...(s.stages||[]).map(stage=>stage.diagram)].filter((g):g is NonNullable<typeof g>=>!!g);
    for(const graph of graphs){
    for(const trace of graph.traces)for(const edge of trace.steps){
      const path=architectureRoute(graph.nodes,edge.from,edge.to);
      for(let i=1;i<path.length;i++){
        const a=path[i-1],b=path[i];assert.ok(a.x===b.x||a.y===b.y);
        for(const n of graph.nodes){
          if(n.id===edge.from||n.id===edge.to)continue;
          const intersects=a.x===b.x?a.x>n.x-88&&a.x<n.x+88&&Math.max(a.y,b.y)>n.y-32&&Math.min(a.y,b.y)<n.y+32:a.y>n.y-32&&a.y<n.y+32&&Math.max(a.x,b.x)>n.x-88&&Math.min(a.x,b.x)<n.x+88;
          assert.equal(intersects,false,`${l.id}: ${edge.from}->${edge.to} intersects ${n.id}`);
        }
      }
    }
    }
  }
});

test('roofline distinguishes latency bound, aggregate ceiling and configurations exceeding memory',async()=>{
  const {decodeRoofline}=await import('../src/lib/handbook-models');
  const input={parameters:8e9,weightBytes:2,batch:1,context:4096,kvBytesPerToken:131072,bandwidthGBs:1000,computeTFLOPs:200,memoryGB:48};
  const a=decodeRoofline(input),b=decodeRoofline({...input,batch:64});
  assert.ok(a.memorySeconds>a.computeSeconds);
  assert.ok(b.totalTokens>a.totalTokens);
  assert.ok(b.perUserTokens<a.perUserTokens);
  assert.equal(decodeRoofline({...input,batch:256,context:32768}).fits,false);
  assert.throws(()=>decodeRoofline({...input,bandwidthGBs:0}));
});
test('context budget reserves output and tool space and availability budget preserves units',async()=>{
  const {contextBudget,availabilityBudget}=await import('../src/lib/handbook-models');
  assert.deepEqual(contextBudget({window:100,system:10,history:20,evidence:30,tools:10,output:30}),{required:100,remaining:0,fits:true});
  assert.equal(contextBudget({window:100,system:10,history:20,evidence:30,tools:10,output:31}).fits,false);
  assert.ok(Math.abs(availabilityBudget(99.9,30)-2592)<1e-6);
  assert.ok(Math.abs(availabilityBudget(99.999,30)-25.92)<1e-6);
  assert.throws(()=>availabilityBudget(101,30));
});

test('queue model marks overload unstable and handshake reuse removes setup without erasing request RTT',async()=>{
  const {mm1Queue,requestHandshake}=await import('../src/lib/handbook-models');
  assert.equal(mm1Queue(8,10).meanSeconds,.5);
  assert.equal(mm1Queue(9,10).meanSeconds,1);
  assert.equal(mm1Queue(10,10).stable,false);
  assert.equal(mm1Queue(11,10).meanSeconds,null);
  assert.equal(requestHandshake('tcp-tls',40,30,20).total,170);
  assert.equal(requestHandshake('quic',40,30,20).total,130);
  assert.equal(requestHandshake('reuse',40,30,20).total,60);
  assert.throws(()=>mm1Queue(8,0));
});
