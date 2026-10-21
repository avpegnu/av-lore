import {chromium} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore';const errors=[],report=[];
fs.mkdirSync('artifacts',{recursive:true});
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 const context=await b.newContext({viewport:{width:1600,height:1100},reducedMotion:'reduce'});const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));
 for(const locale of ['vi','en']){
  await p.goto(base+(locale==='en'?'/en':'')+'/system-design/consistency/');if(locale==='en')await p.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
  const labs=p.locator('.handbook-experiment');assert.equal(await labs.count(),3);
  for(const lab of await labs.all()){await lab.scrollIntoViewIfNeeded();await lab.locator('xpath=ancestor::astro-island[1]').evaluate(async el=>{if(el.dataset.uiReady==='true')return;await new Promise(r=>el.addEventListener('av-lore:island-ready',r,{once:true}));});}
  const lag=labs.nth(0),version=lag.locator('input[type=range]'),policies=lag.locator('.worksheet-choices button');
  await version.focus();await p.keyboard.press('Home');await policies.nth(2).click();await p.waitForFunction(()=>[...document.querySelectorAll('.handbook-experiment')[0].querySelectorAll('dd')].every(e=>e.textContent==='Waiting'));
  await version.focus();await p.keyboard.press('End');await p.waitForFunction(()=>document.querySelector('.handbook-experiment dd').textContent==='3');
  assert.equal(await lag.locator('dd').nth(1).textContent(),'Preserved');await version.focus();await p.keyboard.press('Home');await policies.nth(1).click();
  await p.waitForFunction(()=>document.querySelector('.handbook-experiment dd').textContent==='3');await policies.first().click();assert.equal(await lag.locator('dd').first().textContent(),'0');
  const q=labs.nth(1),ranges=q.locator('input[type=range]');for(const i of [0,1,2]){await ranges.nth(i).focus();await p.keyboard.press('Home');}
  assert.equal(await q.locator('dd').first().textContent(),'0');await ranges.nth(3).focus();await p.keyboard.press('End');assert.equal(await q.locator('dd').nth(1).textContent(),'No');assert.equal(await q.locator('dd').nth(2).textContent(),'No');
  const raft=labs.nth(2),frames=raft.locator('.worksheet-choices button');
  for(let f=0;f<5;f++){
   await frames.nth(f).click();const nodes=raft.locator('.raft-nodes > div');assert.equal(await nodes.count(),5);
   const data=await nodes.allTextContents();assert.ok(data.every(s=>/commitIndex\s*[12]/.test(s)));
   if(f===2||f===3){assert.equal(await raft.locator('.raft-leader').count(),2);assert.ok(data[0].includes('term 1'));assert.ok(data[2].includes('term 2'));assert.ok(/commitIndex\s*1/.test(data[0]));}
   if(f===4){assert.equal(await raft.locator('.raft-leader').count(),1);assert.ok(data.every(s=>s.includes('term 2')&&/commitIndex\s*2/.test(s)));}
   if(locale==='en')await p.waitForFunction(()=>!/[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(document.querySelectorAll('.handbook-experiment')[2].innerText));
  }
  await raft.screenshot({path:`artifacts/consistency-${locale}-raft-desktop.png`});await p.setViewportSize({width:390,height:850});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await raft.screenshot({path:`artifacts/consistency-${locale}-raft-mobile.png`});await p.setViewportSize({width:1600,height:1100});report.push({locale,semantics:'passed'});
 }
 for(const theme of JSON.parse(fs.readFileSync('src/lib/themes.json','utf8'))){await p.evaluate(id=>document.documentElement.dataset.theme=id,theme.id);const result=await new AxeBuilder({page:p}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();report.push({theme:theme.id,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});}
}finally{await b.close();fs.writeFileSync('artifacts/consistency-browser-report.json',JSON.stringify({errors,report},null,2));}
assert.deepEqual(errors,[]);assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));console.log('Consistency: session guarantees, quorum availability, all Raft frames, both locales, mobile and 9 theme accessibility passed.');
