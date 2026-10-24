import fs from 'node:fs';
import assert from 'node:assert/strict';
const catalog=JSON.parse(fs.readFileSync('src/lib/handbook-catalog.json','utf8'));
const lessons=fs.readdirSync('src/content/handbook').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync('src/content/handbook/'+f,'utf8')));
assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length,'Duplicate planned ID');
const authored=new Map(lessons.map(l=>[l.id,l]));
assert.equal(authored.size,lessons.length,'Duplicate authored ID');
for(const lesson of lessons){
  assert.ok(catalog.some(c=>c.id===lesson.id&&c.group===lesson.group),'Unregistered lesson '+lesson.id);
  assert.equal(new Set(lesson.sections.map(s=>s.id)).size,lesson.sections.length,'Repeated section '+lesson.id);
  for(const section of lesson.sections)assert.ok(section.paragraphs?.length||section.table||section.diagram||section.api||section.stages||section.questions,'Empty section '+lesson.id+'/'+section.id);
  const visit=value=>{
    if(!value||typeof value!=='object')return;
    if('vi' in value||'en' in value){assert.ok(typeof value.vi==='string'&&value.vi.trim());assert.ok(typeof value.en==='string'&&value.en.trim());return;}
    for(const child of Object.values(value))visit(child);
  };visit(lesson);
}
const report={planned:catalog.length,authored:lessons.length,reviewed:lessons.filter(l=>l.status==='complete').length,
  groups:Object.fromEntries([...new Set(catalog.map(c=>c.group))].map(group=>[group,{planned:catalog.filter(c=>c.group===group).length,authored:lessons.filter(l=>l.group===group).length,reviewed:lessons.filter(l=>l.group===group&&l.status==='complete').length}])),
  missing:catalog.filter(c=>!authored.has(c.id)).map(c=>c.id),pendingReview:lessons.filter(l=>l.status!=='complete').map(l=>l.id),
  visualInventory:lessons.map(l=>({id:l.id,overview:!!l.overview,flows:l.sections.filter(s=>s.flow).length,cardGroups:l.sections.filter(s=>s.cards).length,
    diagrams:l.sections.filter(s=>s.diagram).length+l.sections.reduce((sum,s)=>sum+(s.stages||[]).filter(stage=>stage.diagram).length,0),
    interactiveSections:l.sections.filter(s=>s.experiment||s.stages).length,
    review:'Structural inventory only; independent content and visual review is recorded separately in lesson status.'}))};
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/handbook-content-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--require-complete'))assert.equal(report.reviewed,report.planned,'The agreed handbook scope is not complete; see missing/pendingReview.');
