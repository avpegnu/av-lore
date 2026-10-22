import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext();
const page=await context.newPage();
await page.emulateMedia({reducedMotion:'reduce'});
const errors=[];
page.on('pageerror',e=>errors.push({route:page.url(),message:String(e)}));
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4322/av-lore';
const contentDirectory=process.env.HANDBOOK_CONTENT_DIR||'src/content/handbook';
const allLessons=fs.readdirSync(contentDirectory).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(contentDirectory,f),'utf8')));
const requestedIds=(process.env.HANDBOOK_IDS||'').split(',').filter(Boolean);
assert.ok(requestedIds.every(id=>allLessons.some(l=>l.id===id)),'Unknown HANDBOOK_IDS entry');
const lessons=requestedIds.length?allLessons.filter(l=>requestedIds.includes(l.id)):allLessons;
assert.ok(lessons.length,'No handbook lessons selected');
const routes=lessons.map(l=>(l.group==='case'?'handbook/system-design/':l.group==='episode'?'episodes/':l.group==='ai'?'ai-systems/':'system-design/')+l.id+'/');
fs.mkdirSync('artifacts',{recursive:true});
const report=[];
try {
for(const locale of ['','en/'])for(const route of routes){
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(base+'/'+locale+route);
  if(locale)await page.waitForFunction(()=>document.documentElement.dataset.languageReady==='true');
  for(const explorer of await page.locator('.architecture-explorer').all()){
    await explorer.scrollIntoViewIfNeeded();
    await explorer.locator('xpath=ancestor::astro-island[1]').evaluate(async el=>{
      if(el.getAttribute('data-ui-ready')==='true')return;
      await new Promise(resolve=>el.addEventListener('av-lore:island-ready',resolve,{once:true}));
    });
    const tabs=explorer.locator('.architecture-tabs [role=tab]');
    for(let i=0;i<await tabs.count();i++){
      await tabs.nth(i).click();
      const steps=explorer.locator('.architecture-steps button');
      for(let j=0;j<await steps.count();j++){
        await steps.nth(j).click();
        assert.equal(await explorer.locator('.architecture-steps [aria-current=step]').count(),1);
        assert.ok(await explorer.locator('.architecture-edge.is-current').count()>=1);
      }
    }
    const nodes=explorer.locator('.architecture-node');
    await nodes.last().focus();await page.keyboard.press('Enter');
    assert.equal(await nodes.last().getAttribute('aria-pressed'),'true');
    await tabs.first().click();await tabs.first().focus();await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.nth(await tabs.count()>1?1:0).getAttribute('aria-selected'),'true');
  }
  const worksheets=page.locator('main .handbook-experiment');
  for(let i=0;i<await worksheets.count();i++){
    const worksheet=worksheets.nth(i);
    await worksheet.scrollIntoViewIfNeeded();
    await page.waitForFunction(index=>document.querySelectorAll('main .handbook-experiment')[index]?.closest('astro-island')?.getAttribute('data-ui-ready')==='true',i);
    const range=worksheet.locator('input[type=range]').first();
    const before=await worksheet.innerHTML();
    if(await range.count()){
      await range.focus();
      const direction=await range.evaluate(el=>Number(el.value)>=Number(el.max)?'ArrowLeft':'ArrowRight');
      await page.keyboard.press(direction);
    }else if(await worksheet.locator('input[type=checkbox]').count()){
      await worksheet.locator('input[type=checkbox]').first().click();
    }else{
      await worksheet.locator('.worksheet-choices button,button[aria-pressed=false]').last().click();
    }
    await page.waitForFunction(({index,previous})=>document.querySelectorAll('main .handbook-experiment')[index]?.innerHTML!==previous,{index:i,previous:before});
  }
  const lesson=lessons.find(l=>route.endsWith('/'+l.id+'/'));
  if(lesson.overview)assert.equal(await page.locator('.lesson-overview li').count(),lesson.overview.steps.length,'Missing lesson map '+route);
  assert.equal(await page.locator('.learning-cards .learning-card').count(),lesson.sections.reduce((count,s)=>count+(s.cards?.length||0),0),'Missing visual cards '+route);
  const timelines=page.locator('.build-timeline');
  const authoredTimelines=lesson.sections.filter(s=>s.stages).map(s=>s.stages);
  for(let t=0;t<await timelines.count();t++){
    const timeline=timelines.nth(t),stages=timeline.locator(':scope > ol > li > button');
    await stages.first().scrollIntoViewIfNeeded();
    for(let i=0;i<await stages.count();i++){
      await stages.nth(i).click();
      await page.waitForFunction(({timelineIndex,expected})=>document.querySelectorAll('.build-timeline')[timelineIndex]?.querySelector('.build-stage > div > h3')?.textContent===expected,{timelineIndex:t,expected:authoredTimelines[t][i].title[locale?'en':'vi']});
      const diagram=authoredTimelines[t][i].diagram;
      if(diagram){
        assert.equal(await timeline.locator('.architecture-node').count(),diagram.nodes.length);
        const tabs=timeline.locator('.architecture-tabs [role=tab]');
        for(let trace=0;trace<await tabs.count();trace++){
          await tabs.nth(trace).click();
          const steps=timeline.locator('.architecture-steps button');
          await steps.last().click();
          assert.equal(await timeline.locator('.architecture-steps [aria-current=step]').count(),1);
        }
      }
    }
  }
  await page.locator('.handbook-questions details').first().locator('summary').click();
  assert.equal(await page.locator('.handbook-questions details').first().getAttribute('open'),'');
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:950});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Page overflow '+locale+route);
    // Arrows intentionally extend into the gap between flow steps; inspect text and the outer figure instead.
    const overflow=await page.locator('.learning-flow,.learning-flow li > p,.learning-flow li > strong,.learning-card,.planner-checklist').evaluateAll(elements=>elements.filter(el=>el.clientWidth>0&&el.scrollWidth>el.clientWidth+1).map(el=>el.textContent.slice(0,100)));
    assert.deepEqual(overflow,[],'Visual content overflow '+locale+route);
  }
  if(locale)await page.waitForFunction(()=>![...document.querySelectorAll('main astro-island[data-ui-ready=true]')].some(el=>(()=>{const clone=el.cloneNode(true);clone.querySelectorAll('[translate=no],script,style,template').forEach(n=>n.remove());return /[ăâđêôơưĂÂĐÊÔƠƯ\u1EA0-\u1EF9]/.test(clone.textContent);})()));
  await page.screenshot({path:'artifacts/handbook-'+(locale?'en-':'vi-')+route.split('/').filter(Boolean).at(-1)+'-mobile.png',fullPage:true});
  report.push({route:locale+route,interaction:'passed'});
}
const themes=JSON.parse(fs.readFileSync('src/lib/themes.json','utf8'));
await page.setViewportSize({width:1440,height:1000});
await page.goto(base+'/handbook/system-design/news-feed/');
await page.locator('.architecture-explorer').first().scrollIntoViewIfNeeded();
await page.locator('astro-island[data-ui-ready=true]').first().waitFor();
for(const theme of themes){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme.id);
  const results=await new AxeBuilder({page}).include('.rich-handbook').withTags(['wcag2a','wcag2aa']).analyze();
  report.push({theme:theme.id,violations:results.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))});
}
await page.screenshot({path:'artifacts/news-feed-rich-desktop.png',fullPage:true});
} finally {
await browser.close();
fs.writeFileSync('artifacts/handbook-browser-report.json',JSON.stringify({report,errors},null,2));
}
assert.deepEqual(errors,[]);
assert.ok(report.every(r=>!r.violations?.length),JSON.stringify(report.filter(r=>r.violations?.length)));
console.log(`Rich handbook: ${routes.length*2} localized routes, keyboard, traces, worksheets, stages, mobile and 9 theme accessibility checks passed.`);
